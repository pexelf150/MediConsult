import DoctorSchedule from '../models/DoctorSchedule.js';
import Appointment from '../models/Appointment.js';
import SlotReservation from '../models/SlotReservation.js';
import ApiError from '../utils/ApiError.js';

const mapSchedule = (slot) => ({
  id: slot._id,
  doctor_id: slot.doctor,
  day_of_week: slot.dayOfWeek,
  start_time: slot.startTime,
  end_time: slot.endTime,
  slot_minutes: slot.slotMinutes,
  max_appointments: slot.maxAppointments ?? 10,
});

export const getScheduleByDoctor = async (doctorId) => {
  const slots = await DoctorSchedule.find({ doctor: doctorId }).sort({
    dayOfWeek: 1,
    startTime: 1,
  });

  return slots.map(mapSchedule);
};

export const addScheduleSlot = async (doctorId, { dayOfWeek, startTime, endTime, slotMinutes, maxAppointments }) => {
  if (endTime <= startTime) {
    throw new ApiError(400, 'End time must be after start time');
  }

  const slot = await DoctorSchedule.create({
    doctor: doctorId,
    dayOfWeek,
    startTime,
    endTime,
    slotMinutes: slotMinutes ?? 30,
    maxAppointments: maxAppointments ?? 10,
  });

  return mapSchedule(slot);
};

export const removeScheduleSlot = async (doctorId, slotId) => {
  const slot = await DoctorSchedule.findOneAndDelete({ _id: slotId, doctor: doctorId });

  if (!slot) {
    throw new ApiError(404, 'Schedule slot not found');
  }

  return mapSchedule(slot);
};

/**
 * Returns the doctor's weekly schedule enriched with booked/reserved counts
 * for each date in the provided array.
 */
export const getScheduleWithCapacity = async (doctorId, dates) => {
  const schedule = await getScheduleByDoctor(doctorId);

  // Sri Lanka timezone offset: UTC+5:30 = 330 minutes
  const SRI_LANKA_OFFSET_MINUTES = 330;

  // Build per-block capacity data for each date
  const result = [];
  await Promise.all(
    dates.map(async (dateStr) => {
      const d = new Date(dateStr + 'T00:00:00');
      const dayOfWeek = d.getDay();
      const blocks = schedule.filter((s) => s.day_of_week === dayOfWeek);

      // Get all appointments for the day first (using UTC to avoid timezone issues)
      // The dateStr is in YYYY-MM-DD format, create UTC dates
      const [year, month, day] = dateStr.split('-').map(Number);
      const dayStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      const dayEnd = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

      const [dayAppointments, dayReservations] = await Promise.all([
        Appointment.find({
          doctor: doctorId,
          scheduledAt: { $gte: dayStart, $lte: dayEnd },
        }).select('scheduledAt status'),
        SlotReservation.find({
          doctor: doctorId,
          scheduledAt: { $gte: dayStart, $lte: dayEnd },
          status: 'reserved',
        }).select('scheduledAt'),
      ]);

      // Calculate capacity for each block by checking which appointments/reservations fall within
      const blocksWithCapacity = blocks.map(block => {
        const [startHour, startMin] = block.start_time.split(':').map(Number);
        const [endHour, endMin] = block.end_time.split(':').map(Number);
        
        // Convert schedule times (local Sri Lanka time) to UTC minutes
        const blockStartMinutes = (startHour * 60 + startMin) - SRI_LANKA_OFFSET_MINUTES;
        const blockEndMinutes = (endHour * 60 + endMin) - SRI_LANKA_OFFSET_MINUTES;

        // Count appointments that fall within this block's time range (excluding cancelled)
        const booked = dayAppointments.filter(apt => {
          if (apt.status === 'cancelled') return false;
          const aptDate = new Date(apt.scheduledAt);
          const aptMinutes = aptDate.getUTCHours() * 60 + aptDate.getUTCMinutes();
          return aptMinutes >= blockStartMinutes && aptMinutes < blockEndMinutes;
        }).length;

        const reserved = dayReservations.filter(res => {
          const resDate = new Date(res.scheduledAt);
          const resMinutes = resDate.getUTCHours() * 60 + resDate.getUTCMinutes();
          return resMinutes >= blockStartMinutes && resMinutes < blockEndMinutes;
        }).length;

        return {
          ...block,
          booked,
          reserved,
          active: booked + reserved,
        };
      });

      result.push({
        date: dateStr,
        blocks: blocksWithCapacity,
      });
    })
  );

  return result;
};

export default {
  getScheduleByDoctor,
  addScheduleSlot,
  removeScheduleSlot,
  getScheduleWithCapacity,
};
