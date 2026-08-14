import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import * as rescheduleService from '../services/rescheduleService.js';

export const createRescheduleRequest = asyncHandler(async (req, res) => {
  const { appointmentId, newScheduledAt, reason } = req.body;
  const userId = req.user._id;
  const userRole = req.user.role;

  // Determine who is making the request
  const requestedBy = userRole === 'patient' ? 'patient' : 'doctor';

  const request = await rescheduleService.createRescheduleRequest({
    appointmentId,
    newScheduledAt,
    reason,
    requestedBy,
  });

  res.status(201).json(new ApiResponse(201, 'Reschedule request created successfully', request));
});

export const getDoctorRescheduleRequests = asyncHandler(async (req, res) => {
  const doctorId = req.user._id;
  const requests = await rescheduleService.getDoctorRescheduleRequests(doctorId);

  res.status(200).json(new ApiResponse(200, 'Reschedule requests retrieved', requests));
});

export const getPatientRescheduleRequests = asyncHandler(async (req, res) => {
  const patientId = req.user._id;
  const requests = await rescheduleService.getPatientRescheduleRequests(patientId);

  res.status(200).json(new ApiResponse(200, 'Reschedule requests retrieved', { requests }));
});

export const approveRescheduleRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const reviewerId = req.user._id;

  const request = await rescheduleService.approveRescheduleRequest(requestId, reviewerId);

  res.status(200).json(new ApiResponse(200, 'Reschedule request approved', request));
});

export const rejectRescheduleRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const { rejectionReason } = req.body;
  const reviewerId = req.user._id;

  const request = await rescheduleService.rejectRescheduleRequest(requestId, reviewerId, rejectionReason);

  res.status(200).json(new ApiResponse(200, 'Reschedule request rejected', request));
});

export const cancelRescheduleRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const userId = req.user._id;

  const request = await rescheduleService.cancelRescheduleRequest(requestId, userId);

  res.status(200).json(new ApiResponse(200, 'Reschedule request cancelled', request));
});

export default {
  createRescheduleRequest,
  getDoctorRescheduleRequests,
  getPatientRescheduleRequests,
  approveRescheduleRequest,
  rejectRescheduleRequest,
  cancelRescheduleRequest,
};
