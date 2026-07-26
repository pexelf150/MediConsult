import { Router } from 'express';
import * as notificationController from '../controllers/notificationController.js';
import { protect } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { paginationValidation } from '../validators/authValidator.js';
import { param } from 'express-validator';

const router = Router();

router.use(protect);

router.get('/', paginationValidation, validate, notificationController.getNotifications);

router.patch(
  '/:id/read',
  param('id').isMongoId().withMessage('Invalid notification ID'),
  validate,
  notificationController.markRead
);

router.patch('/read-all', notificationController.markAllRead);

export default router;
