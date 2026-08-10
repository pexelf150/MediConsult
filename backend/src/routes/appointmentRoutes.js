import { Router } from 'express';
import * as appointmentController from '../controllers/appointmentController.js';
import { protect, restrictTo } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import {
  normalAppointmentValidation,
  urgentAppointmentValidation,
  appointmentIdValidation,
  updateAppointmentStatusValidation,
  cancelAppointmentValidation,
  paginationValidation,
  reserveSlotValidation,
} from '../validators/authValidator.js';
import { body, param } from 'express-validator';

const router = Router();

router.use(protect);

router.get(
  '/',
  paginationValidation,
  validate,
  appointmentController.getMyAppointments
);

router.post(
  '/normal',
  restrictTo('patient'),
  normalAppointmentValidation,
  validate,
  appointmentController.createNormal
);

router.post(
  '/urgent/initiate',
  restrictTo('patient'),
  urgentAppointmentValidation,
  validate,
  appointmentController.initiateUrgent
);

// ─── Slot Reservation Routes ─────────────────────────────────────────────────

router.post(
  '/reserve',
  restrictTo('patient'),
  reserveSlotValidation,
  validate,
  appointmentController.reserveSlot
);

router.post(
  '/reserve/confirm',
  restrictTo('patient'),
  [
    body('reservationId').isMongoId().withMessage('Invalid reservationId'),
    body('symptoms').trim().notEmpty().withMessage('Symptoms are required'),
    body('contactPhone').trim().notEmpty().withMessage('Contact phone is required'),
  ],
  validate,
  appointmentController.confirmReservationAndBook
);

router.delete(
  '/reserve/:id',
  restrictTo('patient'),
  [param('id').isMongoId().withMessage('Invalid reservation ID')],
  validate,
  appointmentController.releaseReservation
);

// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/slot-status/:id',
  appointmentIdValidation,
  validate,
  appointmentController.getSlotStatus
);

router.get(
  '/:id',
  appointmentIdValidation,
  validate,
  appointmentController.getAppointment
);

router.get(
  '/:id/meeting',
  appointmentIdValidation,
  validate,
  appointmentController.getMeetingLink
);

router.patch(
  '/:id/status',
  restrictTo('doctor'),
  updateAppointmentStatusValidation,
  validate,
  appointmentController.updateStatus
);

router.post(
  '/:id/cancel',
  appointmentIdValidation,
  cancelAppointmentValidation,
  validate,
  appointmentController.cancel
);

router.patch(
  '/:id/reschedule',
  [
    appointmentIdValidation,
    body('newScheduledAt').isISO8601().withMessage('Invalid date format'),
    body('reason').optional().trim().isLength({ max: 500 }).withMessage('Reason too long'),
  ],
  validate,
  appointmentController.rescheduleAppointment
);

router.post(
  '/:id/payment',
  restrictTo('patient'),
  appointmentIdValidation,
  validate,
  appointmentController.finalizePayment
);

export default router;
