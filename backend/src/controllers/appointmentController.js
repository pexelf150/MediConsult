import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import * as appointmentService from '../services/appointmentService.js';
import * as reservationService from '../services/reservationService.js';
import { getMeetingJoinUrl } from '../services/jitsiService.js';

export const createNormal = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.createNormalAppointment(req.user._id, req.body);

  res.status(201).json(
    new ApiResponse(201, 'Normal appointment scheduled successfully', { appointment })
  );
});

export const initiateUrgent = asyncHandler(async (req, res) => {
  const result = await appointmentService.initiateUrgentAppointment(req.user._id, req.body);

  res.status(200).json(
    new ApiResponse(200, 'Proceed to payment to confirm urgent appointment', result)
  );
});

export const getMyAppointments = asyncHandler(async (req, res) => {
  const { status, type, page, limit, date } = req.query;

  const result = await appointmentService.getAppointmentsForUser(req.user._id, req.user.role, {
    status,
    type,
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 10,
    date,
  });

  res.status(200).json(new ApiResponse(200, 'Appointments retrieved', result));
});

export const getAppointment = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.getAppointmentById(
    req.params.id,
    req.user._id,
    req.user.role
  );

  res.status(200).json(new ApiResponse(200, 'Appointment retrieved', { appointment }));
});

export const updateStatus = asyncHandler(async (req, res) => {
  const { status, diagnosis, doctorNotes, prescription, cancellationReason, doctorApproved } = req.body;

  const appointment = await appointmentService.updateAppointmentStatus(
    req.params.id,
    req.user._id,
    status,
    { diagnosis, doctorNotes, prescription, cancellationReason, doctorApproved }
  );

  res.status(200).json(new ApiResponse(200, 'Appointment status updated', { appointment }));
});

export const cancel = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.cancelAppointment(
    req.params.id,
    req.user._id,
    req.user.role,
    req.body.reason
  );

  res.status(200).json(new ApiResponse(200, 'Appointment cancelled', { appointment }));
});

export const getMeetingLink = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.getAppointmentById(
    req.params.id,
    req.user._id,
    req.user.role
  );

  const meetingUrl = getMeetingJoinUrl(appointment, req.user.role);

  res.status(200).json(
    new ApiResponse(200, 'Meeting link retrieved', {
      meetingUrl,
      roomName: appointment.jitsi?.roomName,
      appointmentId: appointment._id,
    })
  );
});

// ─── Slot Reservation (ticket-booking style) ────────────────────────────────

export const reserveSlot = asyncHandler(async (req, res) => {
  const { doctorId, scheduledAt } = req.body;
  const reservation = await reservationService.reserveSlot(req.user._id, doctorId, scheduledAt);

  console.log('Reservation created:', {
    reservationId: reservation._id,
    expiresAt: reservation.expiresAt,
    expiresAtISO: reservation.expiresAt.toISOString(),
    scheduledAt: reservation.scheduledAt,
    now: new Date(),
    timeUntilExpiry: (reservation.expiresAt - new Date()) / 1000
  });

  res.status(201).json(
    new ApiResponse(201, 'Slot reserved. You have 10 minutes to complete payment.', {
      reservationId: reservation._id,
      expiresAt: reservation.expiresAt.toISOString(),
      scheduledAt: reservation.scheduledAt.toISOString(),
      doctorId: reservation.doctor,
    })
  );
});

export const releaseReservation = asyncHandler(async (req, res) => {
  await reservationService.releaseReservation(req.params.id, req.user._id);
  res.status(200).json(new ApiResponse(200, 'Reservation released', {}));
});

export const confirmReservationAndBook = asyncHandler(async (req, res) => {
  const { reservationId, symptoms, severity, cholesterol, sugar, bloodPressure, contactPhone, bloodGroup } = req.body;
  const result = await appointmentService.initiateNormalAppointmentPayment(
    req.user._id,
    { reservationId, symptoms, severity, cholesterol, sugar, bloodPressure, contactPhone, bloodGroup }
  );

  res.status(201).json(
    new ApiResponse(201, 'Proceed to payment to confirm normal appointment', {
      paymentId: result.payment._id,
      checkoutUrl: result.checkoutUrl,
      sessionId: result.sessionId,
      devMode: result.devMode,
    })
  );
});

export const getSlotStatus = asyncHandler(async (req, res) => {
  const { date } = req.query;
  const doctorId = req.params.id;

  if (!date) {
    return res.status(400).json({ success: false, message: 'date query param required (YYYY-MM-DD)' });
  }

  const slots = await reservationService.getBookedSlotTimes(doctorId, date);
  res.status(200).json(new ApiResponse(200, 'Slot status retrieved', slots));
});

export const rescheduleAppointment = asyncHandler(async (req, res) => {
  const { newScheduledAt, reason } = req.body;
  const appointment = await appointmentService.rescheduleAppointment(
    req.params.id,
    req.user._id,
    req.user.role,
    newScheduledAt,
    reason
  );

  res.status(200).json(new ApiResponse(200, 'Appointment rescheduled successfully', { appointment }));
});

export const finalizePayment = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.finalizePayment(
    req.params.id,
    req.user._id,
    req.body
  );

  res.status(200).json(new ApiResponse(200, 'Payment finalized successfully', { appointment }));
});

export default {
  createNormal,
  initiateUrgent,
  getMyAppointments,
  getAppointment,
  updateStatus,
  cancel,
  getMeetingLink,
  reserveSlot,
  releaseReservation,
  confirmReservationAndBook,
  getSlotStatus,
  rescheduleAppointment,
  finalizePayment,
};
