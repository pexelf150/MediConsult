import SlotReservation from '../models/SlotReservation.js';
import Appointment from '../models/Appointment.js';
import DoctorSchedule from '../models/DoctorSchedule.js';
import ApiError from '../utils/ApiError.js';
import { createMeetingForAppointment } from './jitsiService.js';

const RESERVATION_TTL_MINUTES = 15;

/**
 * Reserve a slot atomically. Returns the reservation document.
 * Throws if the slot is already taken or the doctor's capacity is full for that day.
 */
export const reserveSlot = async (patientId, doctorId, scheduledAt) => {
  const slotDate = new Date(scheduledAt);
  const slotDateISO = slotDate.toISOString();
  const now = new Date();

  // 0. Validate that the slot is not in the past
  if (slotDate < now) {
    throw new ApiError(400, 'Cannot book appointments in the past. Please select a future time slot.');
  }

  // 1. Clean up expired reservations for this slot first
  await SlotReservation.deleteMany({
    doctor: doctorId,
    scheduledAt: slotDate,
    status: 'reserved',
    expiresAt: { $lt: new Date() },
  });

  // 1. Check if slot is already reserved or booked
  const conflict = await SlotReservation.findOne({
    doctor: doctorId,
    scheduledAt: slotDate,
    status: 'reserved',
  });
  if (conflict) {
    throw new ApiError(409, 'This slot has just been reserved by another patient. Please choose a different time.');
  }

  const bookedAppt = await Appointment.findOne({
    doctor: doctorId,
    scheduledAt: slotDate,
    status: { $nin: ['cancelled'] },
  });
  if (bookedAppt) {
    throw new ApiError(409, 'This slot is already booked. Please choose a different time.');
  }

  // 2. Check doctor's daily capacity
  const dayStart = new Date(slotDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(slotDate);
  dayEnd.setHours(23, 59, 59, 999);

  // Find schedule block for this day
  const dayOfWeek = slotDate.getDay();
  const scheduleBlock = await DoctorSchedule.findOne({
    doctor: doctorId,
    dayOfWeek,
  });

  if (scheduleBlock) {
    const [bookedCount, reservedCount] = await Promise.all([
      Appointment.countDocuments({
        doctor: doctorId,
        scheduledAt: { $gte: dayStart, $lte: dayEnd },
        status: { $nin: ['cancelled'] },
      }),
      SlotReservation.countDocuments({
        doctor: doctorId,
        scheduledAt: { $gte: dayStart, $lte: dayEnd },
        status: 'reserved',
      }),
    ]);

    if (bookedCount + reservedCount >= scheduleBlock.maxAppointments) {
      throw new ApiError(409, "This doctor's appointment slots for the day are full.");
    }
  }

  // 3. Create the reservation (TTL auto-expires it)
  const expiresAt = new Date(Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000);
  try {
    const reservation = await SlotReservation.create({
      doctor: doctorId,
      patient: patientId,
      scheduledAt: slotDate,
      expiresAt,
      status: 'reserved',
    });
    return reservation;
  } catch (err) {
    if (err.code === 11000) {
      throw new ApiError(409, 'This slot was just reserved by another patient. Please choose a different time.');
    }
    throw err;
  }
};

/**
 * Release a reservation explicitly (patient cancels or navigates away).
 */
export const releaseReservation = async (reservationId, patientId) => {
  const reservation = await SlotReservation.findOne({
    _id: reservationId,
    patient: patientId,
    status: 'reserved',
  });
  if (!reservation) return null;
  reservation.status = 'released';
  await reservation.save();
  return reservation;
};

/**
 * Confirm a reservation after successful payment — creates the appointment.
 */
export const confirmReservation = async (reservationId, patientId, { symptoms, severity = 'medium' }) => {
  const reservation = await SlotReservation.findOne({
    _id: reservationId,
    patient: patientId,
    status: 'reserved',
  });
  if (!reservation) {
    throw new ApiError(404, 'Reservation not found or already expired. Please select a slot again.');
  }
  if (new Date() > reservation.expiresAt) {
    reservation.status = 'expired';
    await reservation.save();
    throw new ApiError(410, 'Your reservation has expired. Please select a slot again.');
  }

  // Create appointment
  const appointment = await Appointment.create({
    patient: patientId,
    doctor: reservation.doctor,
    type: 'normal',
    status: 'confirmed',
    symptoms: symptoms || 'Regular consultation',
    severity,
    scheduledAt: reservation.scheduledAt,
  });

  const meeting = createMeetingForAppointment(appointment._id, { _id: reservation.doctor }, { _id: patientId });
  appointment.jitsi = {
    roomName: meeting.roomName,
    meetingUrl: meeting.meetingUrl,
    jwtToken: meeting.jwtToken,
  };
  await appointment.save();

  reservation.status = 'confirmed';
  reservation.appointment = appointment._id;
  await reservation.save();

  await appointment.populate([
    { path: 'patient', select: 'firstName lastName email phone' },
    { path: 'doctor', select: 'firstName lastName specialization consultationFee' },
  ]);

  return appointment;
};

/**
 * Get active reservation + booked counts per date for a doctor.
 * Returns a map: dateStr -> { booked, reserved, total }
 */
export const getSlotCountsForDates = async (doctorId, dates) => {
  const results = {};
  await Promise.all(
    dates.map(async (dateStr) => {
      const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
      const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);

      // Use local date boundaries
      const localStart = new Date(dateStr + 'T00:00:00');
      const localEnd = new Date(dateStr + 'T23:59:59');

      const [booked, reserved] = await Promise.all([
        Appointment.countDocuments({
          doctor: doctorId,
          scheduledAt: { $gte: localStart, $lte: localEnd },
          status: { $nin: ['cancelled'] },
        }),
        SlotReservation.countDocuments({
          doctor: doctorId,
          scheduledAt: { $gte: localStart, $lte: localEnd },
          status: 'reserved',
        }),
      ]);
      results[dateStr] = { booked, reserved, active: booked + reserved };
    })
  );
  return results;
};

/**
 * Get all reserved/booked slot times for a doctor on a specific date.
 * Used by the patient booking page to show which slots are taken.
 */
export const getBookedSlotTimes = async (doctorId, date) => {
  // Use local date boundaries for proper matching with frontend
  const localStart = new Date(date + 'T00:00:00');
  const localEnd = new Date(date + 'T23:59:59');

  // Clean up expired reservations for this date first
  await SlotReservation.deleteMany({
    doctor: doctorId,
    scheduledAt: { $gte: localStart, $lte: localEnd },
    status: 'reserved',
    expiresAt: { $lt: new Date() },
  });

  const [appointments, reservations] = await Promise.all([
    Appointment.find({
      doctor: doctorId,
      scheduledAt: { $gte: localStart, $lte: localEnd },
      status: { $nin: ['cancelled'] },
    }).select('scheduledAt'),
    SlotReservation.find({
      doctor: doctorId,
      scheduledAt: { $gte: localStart, $lte: localEnd },
      status: 'reserved',
    }).select('scheduledAt expiresAt'),
  ]);

  // Convert to time strings (HH:MM format) for easier comparison
  const bookedTimes = appointments.map((a) => {
    const date = new Date(a.scheduledAt);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  });

  return {
    booked: bookedTimes,
    reserved: reservations.map((r) => ({
      scheduledAt: r.scheduledAt.toISOString(),
      expiresAt: r.expiresAt.toISOString(),
    })),
  };
};

/**
 * Clean up expired reservations (should be called periodically, e.g., by a cron job)
 */
export const cleanupExpiredReservations = async () => {
  const result = await SlotReservation.deleteMany({
    status: 'reserved',
    expiresAt: { $lt: new Date() },
  });
  return { deletedCount: result.deletedCount };
};

export default {
  reserveSlot,
  releaseReservation,
  confirmReservation,
  getSlotCountsForDates,
  getBookedSlotTimes,
  cleanupExpiredReservations,
};
