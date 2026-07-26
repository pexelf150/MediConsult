import { Router } from 'express';
import * as paymentController from '../controllers/paymentController.js';
import { protect, restrictTo } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { paymentIdValidation } from '../validators/authValidator.js';
import { body } from 'express-validator';

const router = Router();

router.post('/webhook', paymentController.stripeWebhook);

router.use(protect, restrictTo('patient'));

router.post(
  '/verify',
  body('sessionId').notEmpty().withMessage('Session ID is required'),
  validate,
  paymentController.verifySession
);

router.get(
  '/:id',
  paymentIdValidation,
  validate,
  paymentController.getPayment
);

router.post(
  '/:id/simulate-success',
  paymentIdValidation,
  validate,
  paymentController.simulateSuccess
);

export default router;
