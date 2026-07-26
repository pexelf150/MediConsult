import { Router } from 'express';
import * as doctorController from '../controllers/doctorController.js';
import { protect, restrictTo } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { paginationValidation, scheduleSlotValidation, scheduleSlotIdValidation } from '../validators/authValidator.js';
import { body } from 'express-validator';

const router = Router();

router.get(
  '/',
  paginationValidation,
  validate,
  doctorController.getAll
);

router.get(
  '/portal/dashboard',
  protect,
  restrictTo('doctor'),
  doctorController.getDashboard
);

router.patch(
  '/portal/availability',
  protect,
  restrictTo('doctor'),
  body('isAvailable').isBoolean().withMessage('isAvailable must be a boolean'),
  validate,
  doctorController.updateAvailability
);

router.patch(
  '/portal/fees',
  protect,
  restrictTo('doctor'),
  [
    body('consultationFee').optional().isFloat({ min: 0 }).withMessage('consultationFee must be a non-negative number'),
    body('urgentFee').optional().isFloat({ min: 0 }).withMessage('urgentFee must be a non-negative number'),
  ],
  validate,
  doctorController.updateFees
);

router.get(
  '/portal/schedule',
  protect,
  restrictTo('doctor'),
  doctorController.getSchedule
);

router.post(
  '/portal/schedule',
  protect,
  restrictTo('doctor'),
  scheduleSlotValidation,
  validate,
  doctorController.addScheduleSlot
);

router.delete(
  '/portal/schedule/:slotId',
  protect,
  restrictTo('doctor'),
  scheduleSlotIdValidation,
  validate,
  doctorController.removeScheduleSlot
);

router.get('/:id/schedule', protect, doctorController.getSchedule);
router.get('/:id/schedule/capacity', protect, doctorController.getScheduleCapacity);
router.get('/:id/slots', protect, doctorController.getSlotStatus);
router.get('/:id/booked-slots', protect, doctorController.getBookedSlots);
router.get('/:id', doctorController.getById);

export default router;
