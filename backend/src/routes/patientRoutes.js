import { Router } from 'express';
import * as patientController from '../controllers/patientController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = Router();

router.use(protect, restrictTo('patient'));

router.get('/dashboard', patientController.getDashboard);
router.get('/profile', patientController.getProfile);
router.put('/profile', patientController.updateProfile);

export default router;
