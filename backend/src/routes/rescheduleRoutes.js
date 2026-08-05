import express from 'express';
import { body } from 'express-validator';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as rescheduleController from '../controllers/rescheduleController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Create a reschedule request
router.post('/request',
  [
    body('appointmentId').notEmpty().withMessage('Appointment ID is required'),
    body('newScheduledAt').notEmpty().withMessage('New scheduled date is required'),
    body('reason').optional().isLength({ max: 500 }).withMessage('Reason must be less than 500 characters'),
  ],
  validate,
  rescheduleController.createRescheduleRequest
);

// Get reschedule requests for the current user (doctor or patient)
router.get('/doctor/requests', rescheduleController.getDoctorRescheduleRequests);
router.get('/patient/requests', rescheduleController.getPatientRescheduleRequests);

// Approve/Reject a reschedule request
router.patch('/:requestId/approve', rescheduleController.approveRescheduleRequest);
router.patch('/:requestId/reject', rescheduleController.rejectRescheduleRequest);

// Cancel a reschedule request
router.patch('/:requestId/cancel', rescheduleController.cancelRescheduleRequest);

export default router;
