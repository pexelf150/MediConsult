import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import Appointment from '../models/Appointment.js';
import Payment from '../models/Payment.js';

export const getDashboard = asyncHandler(async (req, res) => {
  const patientId = req.user._id;

  const [upcomingAppointments, recentAppointments, totalConsultations, pendingPayments] =
    await Promise.all([
      Appointment.find({
        patient: patientId,
        status: { $in: ['scheduled', 'confirmed', 'in_progress'] },
        scheduledAt: { $gte: new Date() },
      })
        .populate('doctor', 'firstName lastName specialization')
        .sort({ scheduledAt: 1 })
        .limit(5),
      Appointment.find({ patient: patientId })
        .populate('doctor', 'firstName lastName specialization')
        .sort({ createdAt: -1 })
        .limit(5),
      Appointment.countDocuments({ patient: patientId, status: 'completed' }),
      Payment.countDocuments({ patient: patientId, status: 'pending' }),
    ]);

  res.status(200).json(
    new ApiResponse(200, 'Patient dashboard data retrieved', {
      stats: {
        totalConsultations,
        pendingPayments,
        upcomingCount: upcomingAppointments.length,
      },
      upcomingAppointments,
      recentAppointments,
    })
  );
});

export default { getDashboard };
