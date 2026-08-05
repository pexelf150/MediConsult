import { Router } from 'express';
import authRoutes from './authRoutes.js';
import appointmentRoutes from './appointmentRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import doctorRoutes from './doctorRoutes.js';
import patientRoutes from './patientRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import currencyRoutes from './currencyRoutes.js';
import passwordResetRoutes from './passwordResetRoutes.js';
import rescheduleRoutes from './rescheduleRoutes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'MediConsult API is running',
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth', authRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/payments', paymentRoutes);
router.use('/doctors', doctorRoutes);
router.use('/patients', patientRoutes);
router.use('/notifications', notificationRoutes);
router.use('/currency', currencyRoutes);
router.use('/password-reset', passwordResetRoutes);
router.use('/reschedule', rescheduleRoutes);

export default router;
