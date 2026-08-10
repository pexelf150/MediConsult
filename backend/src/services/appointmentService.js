import Appointment from '../models/Appointment.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import SlotReservation from '../models/SlotReservation.js';
import ApiError from '../utils/ApiError.js';
import env from '../config/env.js';
import { getStripe } from '../config/stripe.js';
import { findAvailableDoctor, getDoctorById } from './doctorService.js';
import { createMeetingForAppointment } from './jitsiService.js';
import {
  notifyDoctorUrgentAppointment,
  notifyPatientAppointmentConfirmed,
  notifyDoctorAppointmentConfirmed,
  notifyPaymentSuccess,
} from './notificationService.js';

// Health metrics categorization functions
const categorizeCholesterol = (value) => {
  if (!value) return null;
  if (value < 200) return 'normal';
  if (value < 240) return 'high';
  return 'high';
};

const categorizeSugar = (value) => {
  if (!value) return null;
  if (value < 100) return 'normal';
  if (value < 126) return 'high';
  return 'high';
};

const categorizeBloodPressure = (value) => {
  if (!value) return null;
  const match = value.match(/(\d+)\/(\d+)/);
  if (!match) return null;
  const systolic = parseInt(match[1]);
  const diastolic = parseInt(match[2]);
  
  if (systolic < 120 && diastolic < 80) return 'normal';
  if (systolic < 140 && diastolic < 90) return 'high';
  return 'high';
};

export const createNormalAppointment = async (patientId, appointmentData) => {
  const { doctorId, symptoms, scheduledAt, severity = 'medium', contactPhone, bloodGroup, healthMetrics } = appointmentData;

  // Validate that the scheduled time is not in the past
  if (scheduledAt && new Date(scheduledAt) < new Date()) {
    throw new ApiError(400, 'Cannot book appointments in the past. Please select a future time slot.');
  }

  const doctor = doctorId
    ? await User.findOne({ _id: doctorId, role: 'doctor', isActive: true, isAvailable: true })
    : await findAvailableDoctor();

  if (!doctor) {
    throw new ApiError(404, 'Selected doctor is not available');
  }

  const appointment = await Appointment.create({
    patient: patientId,
    doctor: doctor._id,
    type: 'normal',
    status: 'scheduled',
    symptoms,
    severity,
    scheduledAt: scheduledAt || new Date(Date.now() + 24 * 60 * 60 * 1000),
    contactPhone,
    bloodGroup,
    healthMetrics,
  });

  const meeting = createMeetingForAppointment(appointment._id, doctor, { _id: patientId });

  appointment.jitsi = {
    roomName: meeting.roomName,
    meetingUrl: meeting.meetingUrl,
    jwtToken: meeting.jwtToken,
  };
  appointment.status = 'confirmed';
  await appointment.save();

  await appointment.populate([
    { path: 'patient', select: 'firstName lastName email phone' },
    { path: 'doctor', select: 'firstName lastName specialization' },
  ]);

  return appointment;
};

export const initiateUrgentAppointment = async (patientId, { symptoms, severity = 'high', contactPhone }) => {
  if (!symptoms?.trim()) {
    throw new ApiError(400, 'Symptoms are required for urgent consultation');
  }

  const stripe = getStripe();

  // Get minimum urgent fee from available doctors
  const Doctor = (await import('../models/Doctor.js')).default;
  const availableDoctors = await Doctor.find({ isAvailable: true });
  const urgentFee = availableDoctors.length > 0
    ? Math.min(...availableDoctors.map(d => d.urgentFee || 0))
    : env.consultation.urgentFee;

  const payment = await Payment.create({
    patient: patientId,
    amount: urgentFee * 100, // in cents
    currency: env.consultation.currency,
    status: 'pending',
    metadata: {
      symptoms: symptoms.trim(),
      appointmentType: 'urgent',
      contactPhone,
    },
  });

  if (!stripe) {
    payment.status = 'processing';
    await payment.save();

    return {
      payment,
      checkoutUrl: null,
      sessionId: null,
      devMode: true,
      message: 'Stripe not configured. Use POST /api/payments/simulate-success for development.',
    };
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    customer_email: undefined,
    line_items: [
      {
        price_data: {
          currency: env.consultation.currency,
          product_data: {
            name: 'Urgent Doctor Consultation',
            description: 'Immediate online consultation with a qualified doctor',
          },
          unit_amount: env.consultation.urgentFee,
        },
        quantity: 1,
      },
    ],
    metadata: {
      paymentId: payment._id.toString(),
      patientId: patientId.toString(),
      appointmentType: 'urgent',
    },
    success_url: `${env.clientUrl}/patient/appointments/urgent/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.clientUrl}/patient/appointments/urgent/cancel?payment_id=${payment._id}`,
  });

  payment.stripe.sessionId = session.id;
  payment.status = 'processing';
  await payment.save();

  return {
    payment,
    checkoutUrl: session.url,
    sessionId: session.id,
  };
};

export const initiateNormalAppointmentPayment = async (patientId, { reservationId, symptoms, severity = 'medium', cholesterol, sugar, bloodPressure, contactPhone, bloodGroup }) => {
  if (!symptoms?.trim()) {
    throw new ApiError(400, 'Symptoms description is required');
  }

  if (!reservationId) {
    throw new ApiError(400, 'Reservation ID is required');
  }

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

  // Use getDoctorById so discriminator fields like consultationFee are available
  const doctor = await getDoctorById(reservation.doctor.toString());

  console.log('Doctor consultation fee:', doctor.consultationFee);

  const stripe = getStripe();

  const payment = await Payment.create({
    patient: patientId,
    amount: doctor.consultationFee * 100, // in cents
    currency: env.consultation.currency,
    status: 'pending',
    metadata: {
      symptoms: symptoms.trim(),
      appointmentType: 'normal',
      reservationId: reservationId.toString(),
      scheduledAt: reservation.scheduledAt.toISOString(),
      doctorId: reservation.doctor.toString(),
      severity,
      cholesterol,
      sugar,
      bloodPressure,
      contactPhone,
      bloodGroup,
    },
  });

  if (!stripe) {
    payment.status = 'processing';
    await payment.save();

    return {
      payment,
      checkoutUrl: null,
      sessionId: null,
      devMode: true,
      message: 'Stripe not configured. Use POST /api/payments/simulate-success for development.',
    };
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    customer_email: undefined,
    line_items: [
      {
        price_data: {
          currency: env.consultation.currency,
          product_data: {
            name: `Doctor Consultation — Dr. ${doctor.lastName}`,
            description: `Scheduled at ${new Date(reservation.scheduledAt).toLocaleString()}`,
          },
          unit_amount: doctor.consultationFee * 100,
        },
        quantity: 1,
      },
    ],
    metadata: {
      paymentId: payment._id.toString(),
      patientId: patientId.toString(),
      appointmentType: 'normal',
      reservationId: reservationId.toString(),
      cholesterol,
      sugar,
      bloodPressure,
    },
    success_url: `${env.clientUrl}/patient/appointments?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.clientUrl}/patient/appointments?payment_id=${payment._id}`,
  });

  payment.stripe.sessionId = session.id;
  payment.status = 'processing';
  await payment.save();

  return {
    payment,
    checkoutUrl: session.url,
    sessionId: session.id,
  };
};

export const finalizePayment = async (appointmentId, patientId, paymentData) => {
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    throw new ApiError(404, 'Appointment not found');
  }

  if (appointment.patient.toString() !== patientId.toString()) {
    throw new ApiError(403, 'You are not authorized to finalize this payment');
  }

  if (appointment.paymentStatus === 'paid') {
    return appointment;
  }

  // Update appointment payment status
  appointment.paymentStatus = 'paid';
  appointment.status = 'confirmed';

  // Create meeting link
  const doctor = await getDoctorById(appointment.doctor.toString());
  const patient = await User.findById(patientId);
  const meeting = createMeetingForAppointment(appointment._id, doctor, patient);

  appointment.jitsi = {
    roomName: meeting.roomName,
    meetingUrl: meeting.meetingUrl,
    jwtToken: meeting.jwtToken,
  };

  await appointment.save();

  // Populate appointment with doctor and patient details
  await appointment.populate([
    { path: 'patient', select: 'firstName lastName email phone' },
    { path: 'doctor', select: 'firstName lastName specialization phone' },
  ]);

  return appointment;
};

export const completeAppointmentAfterPayment = async (payment, io) => {
  if (payment.status === 'completed' && payment.appointment) {
    const existing = await Appointment.findById(payment.appointment).populate([
      { path: 'patient', select: 'firstName lastName email phone' },
      { path: 'doctor', select: 'firstName lastName specialization phone' },
    ]);
    return existing;
  }

  const patient = await User.findById(payment.patient);
  if (!patient) {
    throw new ApiError(404, 'Patient not found');
  }

  const appointmentType = payment.metadata?.appointmentType || 'urgent';

  let appointment;
  if (appointmentType === 'urgent') {
    const doctor = await findAvailableDoctor();
    const symptoms = payment.metadata?.symptoms || 'Urgent consultation';
    const contactPhone = payment.metadata?.contactPhone || '';

    appointment = await Appointment.create({
      patient: payment.patient,
      doctor: doctor._id,
      type: 'urgent',
      status: 'confirmed',
      symptoms,
      severity: 'high',
      scheduledAt: new Date(),
      payment: payment._id,
      contactPhone,
    });

    const meeting = createMeetingForAppointment(appointment._id, doctor, patient);

    appointment.jitsi = {
      roomName: meeting.roomName,
      meetingUrl: meeting.meetingUrl,
      jwtToken: meeting.jwtToken,
    };
    await appointment.save();

    payment.appointment = appointment._id;
    payment.status = 'completed';
    payment.paidAt = new Date();
    await payment.save();

    await appointment.populate([
      { path: 'patient', select: 'firstName lastName email phone' },
      { path: 'doctor', select: 'firstName lastName specialization phone' },
    ]);

    await notifyDoctorUrgentAppointment(io, doctor, appointment, patient);
    await notifyPaymentSuccess(io, patient, payment, appointment);
  } else {
    // Normal appointment
    const reservationId = payment.metadata?.reservationId;
    if (!reservationId) {
      throw new ApiError(400, 'Reservation ID is required in payment metadata for normal consultations');
    }

    const reservation = await SlotReservation.findById(reservationId);
    if (!reservation) {
      throw new ApiError(410, 'Your reservation has expired and the slot is no longer available. Please select a slot again.');
    }

    if (reservation.status !== 'reserved' || new Date() > reservation.expiresAt) {
      reservation.status = 'expired';
      await reservation.save();
      throw new ApiError(410, 'Your reservation has expired and the slot is no longer available. Please select a slot again.');
    }

    // Use getDoctorById so discriminator fields like consultationFee are available
    const doctor = await getDoctorById(reservation.doctor.toString());

    const symptoms = payment.metadata?.symptoms || 'Regular consultation';
    const severity = payment.metadata?.severity || 'medium';
    const cholesterol = payment.metadata?.cholesterol;
    const sugar = payment.metadata?.sugar;
    const bloodPressure = payment.metadata?.bloodPressure;
    const contactPhone = payment.metadata?.contactPhone || '';
    const bloodGroup = payment.metadata?.bloodGroup;

    appointment = await Appointment.create({
      patient: payment.patient,
      doctor: doctor._id,
      type: 'normal',
      status: 'confirmed',
      symptoms,
      severity,
      scheduledAt: reservation.scheduledAt,
      payment: payment._id,
      contactPhone,
      bloodGroup,
      healthMetrics: {
        cholesterol: {
          value: cholesterol,
          level: categorizeCholesterol(cholesterol),
        },
        sugar: {
          value: sugar,
          level: categorizeSugar(sugar),
        },
        bloodPressure: {
          value: bloodPressure,
          level: categorizeBloodPressure(bloodPressure),
        },
      },
    });

    const meeting = createMeetingForAppointment(appointment._id, doctor, patient);
    appointment.jitsi = {
      roomName: meeting.roomName,
      meetingUrl: meeting.meetingUrl,
      jwtToken: meeting.jwtToken,
    };
    await appointment.save();

    reservation.status = 'confirmed';
    reservation.appointment = appointment._id;
    await reservation.save();

    payment.appointment = appointment._id;
    payment.status = 'completed';
    payment.paidAt = new Date();
    await payment.save();

    await appointment.populate([
      { path: 'patient', select: 'firstName lastName email phone' },
      { path: 'doctor', select: 'firstName lastName specialization phone' },
    ]);

    await notifyPatientAppointmentConfirmed(io, patient, appointment, doctor);
    await notifyDoctorAppointmentConfirmed(io, doctor, appointment, patient);
  }

  return appointment;
};

export const getAppointmentsForUser = async (userId, role, { status, type, page = 1, limit = 10, date }) => {
  const query = role === 'doctor' ? { doctor: userId } : { patient: userId };

  if (status) query.status = status;
  if (type) query.type = type;

  // Filter by date if provided
  if (date) {
    const [year, month, day] = date.split('-').map(Number);
    const dayStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const dayEnd = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    query.scheduledAt = { $gte: dayStart, $lte: dayEnd };
  }

  const skip = (page - 1) * limit;

  const [appointments, total] = await Promise.all([
    Appointment.find(query)
      .populate('patient', 'firstName lastName email phone dateOfBirth gender')
      .populate('doctor', 'firstName lastName specialization')
      .sort({ scheduledAt: 1 })
      .skip(skip)
      .limit(limit),
    Appointment.countDocuments(query),
  ]);

  return {
    appointments,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

export const getAppointmentById = async (appointmentId, userId, role) => {
  const appointment = await Appointment.findById(appointmentId)
    .populate('patient', 'firstName lastName email phone dateOfBirth gender')
    .populate('doctor', 'firstName lastName specialization licenseNumber phone')
    .populate('payment');

  if (!appointment) {
    throw new ApiError(404, 'Appointment not found');
  }

  const isAuthorized =
    role === 'doctor'
      ? appointment.doctor._id.toString() === userId.toString()
      : appointment.patient._id.toString() === userId.toString();

  if (!isAuthorized) {
    throw new ApiError(403, 'Not authorized to view this appointment');
  }

  return appointment;
};

export const updateAppointmentStatus = async (appointmentId, doctorId, status, updates = {}) => {
  const appointment = await Appointment.findOne({
    _id: appointmentId,
    doctor: doctorId,
  });

  if (!appointment) {
    throw new ApiError(404, 'Appointment not found');
  }

  if (updates.doctorApproved !== undefined) {
    appointment.doctorApproved = updates.doctorApproved;
  }

  if (status) {
    appointment.status = status;

    if (status === 'in_progress') {
      appointment.startedAt = new Date();
    }

    if (status === 'completed') {
      appointment.completedAt = new Date();
      if (updates.diagnosis) appointment.diagnosis = updates.diagnosis;
      if (updates.doctorNotes) appointment.doctorNotes = updates.doctorNotes;
    }

    if (status === 'cancelled') {
      appointment.cancellationReason = updates.cancellationReason;
      appointment.cancelledBy = 'doctor';
    }
  }

  // Handle prescription separately (can be saved without status change)
  if (updates.prescription) {
    appointment.prescription = { ...updates.prescription, issuedAt: new Date() };
  }

  await appointment.save();

  return appointment.populate([
    { path: 'patient', select: 'firstName lastName email phone' },
    { path: 'doctor', select: 'firstName lastName specialization' },
  ]);
};

export const cancelAppointment = async (appointmentId, userId, role, reason) => {
  const appointment = await Appointment.findById(appointmentId);

  if (!appointment) {
    throw new ApiError(404, 'Appointment not found');
  }

  const isOwner =
    role === 'doctor'
      ? appointment.doctor.toString() === userId.toString()
      : appointment.patient.toString() === userId.toString();

  if (!isOwner) {
    throw new ApiError(403, 'Not authorized to cancel this appointment');
  }

  if (['completed', 'cancelled'].includes(appointment.status)) {
    throw new ApiError(400, `Cannot cancel an appointment that is already ${appointment.status}`);
  }

  appointment.status = 'cancelled';
  appointment.cancellationReason = reason;
  appointment.cancelledBy = role;
  await appointment.save();

  return appointment;
};

export const rescheduleAppointment = async (appointmentId, userId, role, newScheduledAt, reason) => {
  const appointment = await Appointment.findById(appointmentId);

  if (!appointment) {
    throw new ApiError(404, 'Appointment not found');
  }

  const isOwner =
    role === 'doctor'
      ? appointment.doctor.toString() === userId.toString()
      : appointment.patient.toString() === userId.toString();

  if (!isOwner) {
    throw new ApiError(403, 'Not authorized to reschedule this appointment');
  }

  if (['completed', 'cancelled'].includes(appointment.status)) {
    throw new ApiError(400, `Cannot reschedule an appointment that is already ${appointment.status}`);
  }

  // Validate new time is in the future
  const newDate = new Date(newScheduledAt);
  if (newDate < new Date()) {
    throw new ApiError(400, 'Cannot reschedule to a past time');
  }

  // Check if the new time slot is available
  const conflictingAppointment = await Appointment.findOne({
    doctor: appointment.doctor,
    scheduledAt: newDate,
    status: { $in: ['scheduled', 'confirmed', 'in_progress'] },
    _id: { $ne: appointmentId },
  });

  if (conflictingAppointment) {
    throw new ApiError(400, 'This time slot is already booked. Please choose another time.');
  }

  // Add to reschedule history
  appointment.rescheduleHistory.push({
    originalScheduledAt: appointment.scheduledAt,
    newScheduledAt: newDate,
    rescheduledBy: role,
    rescheduledAt: new Date(),
    reason: reason || '',
  });

  // Update appointment
  appointment.scheduledAt = newDate;
  appointment.isRescheduled = true;
  appointment.rescheduleRequestedBy = role;

  await appointment.save();

  // Notify the other party about reschedule
  if (role === 'doctor') {
    // Notify patient
    await notifyPatientAppointmentRescheduled(appointment, newDate, reason);
  } else {
    // Notify doctor
    await notifyDoctorAppointmentRescheduled(appointment, newDate, reason);
  }

  return appointment.populate([
    { path: 'patient', select: 'firstName lastName email phone' },
    { path: 'doctor', select: 'firstName lastName specialization' },
  ]);
};

export default {
  createNormalAppointment,
  initiateUrgentAppointment,
  initiateNormalAppointmentPayment,
  finalizePayment,
  completeAppointmentAfterPayment,
  getAppointmentsForUser,
  getAppointmentById,
  updateAppointmentStatus,
  cancelAppointment,
  rescheduleAppointment,
};
