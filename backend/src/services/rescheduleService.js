import RescheduleRequest from '../models/RescheduleRequest.js';
import Appointment from '../models/Appointment.js';
import Notification from '../models/Notification.js';
import ApiError from '../utils/ApiError.js';

/**
 * Create a reschedule request
 */
export const createRescheduleRequest = async (data) => {
  const { appointmentId, newScheduledAt, reason, requestedBy } = data;

  console.log('Creating reschedule request:', { appointmentId, newScheduledAt, reason, requestedBy });

  // Check if appointment exists
  const appointment = await Appointment.findById(appointmentId)
    .populate('patient')
    .populate('doctor');

  if (!appointment) {
    console.log('Appointment not found:', appointmentId);
    throw new ApiError(404, 'Appointment not found');
  }

  console.log('Appointment found:', { id: appointment._id, status: appointment.status, patient: appointment.patient._id, doctor: appointment.doctor._id });

  // Check if appointment can be rescheduled
  if (appointment.status !== 'scheduled' && appointment.status !== 'confirmed') {
    console.log('Invalid appointment status:', appointment.status);
    throw new ApiError(400, 'Only scheduled or confirmed appointments can be rescheduled');
  }

  // Check if there's already a pending reschedule request
  const existingRequest = await RescheduleRequest.findOne({
    appointment: appointmentId,
    status: 'pending',
  });

  if (existingRequest) {
    console.log('Existing pending request found:', existingRequest._id);
    throw new ApiError(400, 'A reschedule request is already pending for this appointment');
  }

  // Create reschedule request
  const rescheduleRequest = await RescheduleRequest.create({
    appointment: appointmentId,
    patient: appointment.patient._id,
    doctor: appointment.doctor._id,
    requestedBy,
    originalScheduledAt: appointment.scheduledAt,
    requestedScheduledAt: newScheduledAt,
    reason,
  });

  // Create notification for the recipient
  const recipientId = requestedBy === 'patient' ? appointment.doctor._id : appointment.patient._id;
  const patientName = appointment.patient?.firstName && appointment.patient?.lastName 
    ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
    : appointment.patient?.email || 'Patient';
  const doctorName = appointment.doctor?.firstName && appointment.doctor?.lastName
    ? `${appointment.doctor.firstName} ${appointment.doctor.lastName}`
    : appointment.doctor?.email || 'Doctor';
  
  await Notification.create({
    recipient: recipientId,
    title: 'Reschedule Request',
    message: requestedBy === 'patient' 
      ? `Patient ${patientName} requested to reschedule their appointment from ${new Date(appointment.scheduledAt).toLocaleString()} to ${new Date(newScheduledAt).toLocaleString()}`
      : `Doctor ${doctorName} requested to reschedule your appointment from ${new Date(appointment.scheduledAt).toLocaleString()} to ${new Date(newScheduledAt).toLocaleString()}`,
    type: 'reschedule_request',
    data: {
      rescheduleRequestId: rescheduleRequest._id,
      appointmentId: appointmentId,
    },
  });

  return rescheduleRequest;
};

/**
 * Get reschedule requests for a doctor
 */
export const getDoctorRescheduleRequests = async (doctorId) => {
  const requests = await RescheduleRequest.find({ doctor: doctorId })
    .populate('appointment')
    .populate('patient', 'firstName lastName email')
    .sort({ createdAt: -1 });

  return requests;
};

/**
 * Get reschedule requests for a patient
 */
export const getPatientRescheduleRequests = async (patientId) => {
  const requests = await RescheduleRequest.find({ patient: patientId })
    .populate('appointment')
    .populate('doctor', 'firstName lastName email')
    .sort({ createdAt: -1 });

  return requests;
};

/**
 * Approve a reschedule request
 */
export const approveRescheduleRequest = async (requestId, reviewerId) => {
  const request = await RescheduleRequest.findById(requestId)
    .populate('appointment')
    .populate('patient')
    .populate('doctor');

  if (!request) {
    throw new ApiError(404, 'Reschedule request not found');
  }

  if (request.status !== 'pending') {
    throw new ApiError(400, 'This request has already been processed');
  }

  // Update appointment
  const appointment = await Appointment.findById(request.appointment._id);
  
  // Add to reschedule history
  appointment.rescheduleHistory.push({
    originalScheduledAt: request.originalScheduledAt,
    newScheduledAt: request.requestedScheduledAt,
    rescheduledBy: request.requestedBy,
    rescheduledAt: new Date(),
    reason: request.reason,
  });

  appointment.scheduledAt = request.requestedScheduledAt;
  appointment.isRescheduled = true;
  appointment.rescheduleRequestedBy = null;
  await appointment.save();

  // Update request status
  request.status = 'approved';
  request.reviewedBy = reviewerId;
  request.reviewedAt = new Date();
  await request.save();

  // Create notification for the requester
  const requesterId = request.requestedBy === 'patient' ? request.patient._id : request.doctor._id;
  await Notification.create({
    recipient: requesterId,
    title: 'Reschedule Request Approved',
    message: `Your reschedule request has been approved. The appointment is now scheduled for ${new Date(request.requestedScheduledAt).toLocaleString()}`,
    type: 'reschedule_approved',
    data: {
      appointmentId: request.appointment._id,
    },
  });

  return request;
};

/**
 * Reject a reschedule request
 */
export const rejectRescheduleRequest = async (requestId, reviewerId, rejectionReason) => {
  const request = await RescheduleRequest.findById(requestId)
    .populate('appointment')
    .populate('patient')
    .populate('doctor');

  if (!request) {
    throw new ApiError(404, 'Reschedule request not found');
  }

  if (request.status !== 'pending') {
    throw new ApiError(400, 'This request has already been processed');
  }

  // Update request status
  request.status = 'rejected';
  request.reviewedBy = reviewerId;
  request.reviewedAt = new Date();
  request.rejectionReason = rejectionReason;
  await request.save();

  // Clear the reschedule requested flag from appointment
  const appointment = await Appointment.findById(request.appointment._id);
  appointment.rescheduleRequestedBy = null;
  await appointment.save();

  // Create notification for the requester
  const requesterId = request.requestedBy === 'patient' ? request.patient._id : request.doctor._id;
  await Notification.create({
    recipient: requesterId,
    title: 'Reschedule Request Rejected',
    message: `Your reschedule request has been rejected${rejectionReason ? ': ' + rejectionReason : ''}`,
    type: 'reschedule_rejected',
    data: {
      appointmentId: request.appointment._id,
    },
  });

  return request;
};

/**
 * Cancel a reschedule request
 */
export const cancelRescheduleRequest = async (requestId, userId) => {
  const request = await RescheduleRequest.findById(requestId);

  if (!request) {
    throw new ApiError(404, 'Reschedule request not found');
  }

  if (request.status !== 'pending') {
    throw new ApiError(400, 'Only pending requests can be cancelled');
  }

  // Check if user is the requester
  const requesterField = request.requestedBy === 'patient' ? 'patient' : 'doctor';
  if (request[requesterField].toString() !== userId.toString()) {
    throw new ApiError(403, 'You can only cancel your own requests');
  }

  request.status = 'cancelled';
  await request.save();

  // Clear the reschedule requested flag from appointment
  const appointment = await Appointment.findById(request.appointment);
  if (appointment) {
    appointment.rescheduleRequestedBy = null;
    await appointment.save();
  }

  return request;
};

export default {
  createRescheduleRequest,
  getDoctorRescheduleRequests,
  getPatientRescheduleRequests,
  approveRescheduleRequest,
  rejectRescheduleRequest,
  cancelRescheduleRequest,
};
