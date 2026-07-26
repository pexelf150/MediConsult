import { Router } from 'express';
import * as patientController from '../controllers/patientController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = Router();

router.use(protect, restrictTo('patient'));

router.get('/dashboard', patientController.getDashboard);

export default router;
