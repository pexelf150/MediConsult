import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import validate from '../middleware/validate.js';
import {
  patientRegisterValidation,
  doctorRegisterValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation,
} from '../validators/authValidator.js';

const router = Router();

router.post(
  '/patient/register',
  authLimiter,
  patientRegisterValidation,
  validate,
  authController.registerPatient
);

router.post(
  '/doctor/register',
  authLimiter,
  doctorRegisterValidation,
  validate,
  authController.registerDoctor
);

router.post(
  '/patient/login',
  authLimiter,
  loginValidation,
  validate,
  authController.loginPatient
);

router.post(
  '/doctor/login',
  authLimiter,
  loginValidation,
  validate,
  authController.loginDoctor
);

router.post('/logout', protect, authController.logout);
router.get('/me', protect, authController.getMe);
router.patch('/me', protect, updateProfileValidation, validate, authController.updateMe);
router.patch('/change-password', protect, changePasswordValidation, validate, authController.changePassword);
router.post('/google/url', authController.getGoogleAuthUrl);
router.get('/google/callback', authController.handleGoogleCallback);

export default router;
