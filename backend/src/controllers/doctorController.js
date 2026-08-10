import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import * as doctorService from '../services/doctorService.js';
import * as scheduleService from '../services/scheduleService.js';
import * as reservationService from '../services/reservationService.js';

export const getAll = asyncHandler(async (req, res) => {
  const { specialization, available, page, limit } = req.query;

  const result = await doctorService.getAllDoctors({
    specialization,
    available,
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 10,
  });

  res.status(200).json(new ApiResponse(200, 'Doctors retrieved', result));
});

export const getById = asyncHandler(async (req, res) => {
  const doctor = await doctorService.getDoctorById(req.params.id);

  res.status(200).json(new ApiResponse(200, 'Doctor retrieved', { doctor }));
});

export const updateAvailability = asyncHandler(async (req, res) => {
  const { isAvailable } = req.body;

  const doctor = await doctorService.updateDoctorAvailability(req.user._id, isAvailable);

  res.status(200).json(new ApiResponse(200, 'Availability updated', { doctor }));
});

export const updateFees = asyncHandler(async (req, res) => {
  const { consultationFee, urgentFee } = req.body;

  const doctor = await doctorService.updateDoctorFees(req.user._id, { consultationFee, urgentFee });

  res.status(200).json(new ApiResponse(200, 'Fees updated', { doctor }));
});

export const getDashboard = asyncHandler(async (req, res) => {
  const Appointment = (await import('../models/Appointment.js')).default;
  const Doctor = (await import('../models/Doctor.js')).default;

  const doctorId = req.user._id;

  const [urgentCount, todayAppointments, upcomingAppointments, completedCount, doctor] = await Promise.all([
    Appointment.countDocuments({ doctor: doctorId, type: 'urgent', status: { $in: ['confirmed', 'in_progress'] } }),
    Appointment.find({
      doctor: doctorId,
      scheduledAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lt: new Date(new Date().setHours(23, 59, 59, 999)),
      },
      status: { $nin: ['cancelled', 'completed'] },
    })
      .populate('patient', 'firstName lastName phone')
      .select('patient doctor type status scheduledAt symptoms severity bloodGroup healthMetrics doctorApproved jitsi')
      .sort({ scheduledAt: 1 }),
    Appointment.find({
      doctor: doctorId,
      status: { $in: ['scheduled', 'confirmed'] },
      scheduledAt: { $gte: new Date() },
    })
      .populate('patient', 'firstName lastName')
      .sort({ scheduledAt: 1 })
      .limit(10),
    Appointment.countDocuments({ doctor: doctorId, status: 'completed' }),
    Doctor.findById(doctorId).select('consultationFee urgentFee isAvailable'),
  ]);

  res.status(200).json(
    new ApiResponse(200, 'Doctor dashboard data retrieved', {
      stats: {
        urgentCases: urgentCount,
        completedConsultations: completedCount,
        todayAppointments: todayAppointments.length,
      },
      todayAppointments,
      upcomingAppointments,
      consultationFee: doctor?.consultationFee,
      urgentFee: doctor?.urgentFee,
      isAvailable: doctor?.isAvailable,
    })
  );
});

export const getBookedSlots = asyncHandler(async (req, res) => {
  const Appointment = (await import('../models/Appointment.js')).default;
  const doctorId = req.params.id;
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ success: false, message: 'Date query parameter is required (YYYY-MM-DD)' });
  }

  const startOfDay = new Date(new Date(date).setHours(0, 0, 0, 0));
  const endOfDay = new Date(new Date(date).setHours(23, 59, 59, 999));

  const appointments = await Appointment.find({
    doctor: doctorId,
    scheduledAt: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
    status: { $nin: ['cancelled'] },
  }).select('scheduledAt');

  const bookedSlots = appointments.map((apt) => apt.scheduledAt.toISOString());

  res.status(200).json({
    success: true,
    message: 'Booked slots retrieved',
    data: { bookedSlots },
  });
});

export const getSchedule = asyncHandler(async (req, res) => {
  const doctorId = req.params.id ?? req.user._id;
  const schedule = await scheduleService.getScheduleByDoctor(doctorId);

  res.status(200).json(new ApiResponse(200, 'Schedule retrieved', { schedule }));
});

export const addScheduleSlot = asyncHandler(async (req, res) => {
  const slot = await scheduleService.addScheduleSlot(req.user._id, req.body);

  res.status(201).json(new ApiResponse(201, 'Schedule slot added', { slot }));
});

export const removeScheduleSlot = asyncHandler(async (req, res) => {
  const slot = await scheduleService.removeScheduleSlot(req.user._id, req.params.slotId);

  res.status(200).json(new ApiResponse(200, 'Schedule slot removed', { slot }));
});

export const getScheduleCapacity = asyncHandler(async (req, res) => {
  const doctorId = req.params.id;
  const { dates } = req.query; // comma-separated YYYY-MM-DD strings

  if (!dates) {
    return res.status(400).json({ success: false, message: 'dates query param required (comma-separated YYYY-MM-DD)' });
  }

  const dateList = dates.split(',').map((d) => d.trim()).filter(Boolean);
  const capacity = await scheduleService.getScheduleWithCapacity(doctorId, dateList);

  res.status(200).json(new ApiResponse(200, 'Schedule capacity retrieved', { capacity }));
});

export const getSlotStatus = asyncHandler(async (req, res) => {
  const doctorId = req.params.id;
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ success: false, message: 'date query param required (YYYY-MM-DD)' });
  }

  const slots = await reservationService.getBookedSlotTimes(doctorId, date);
  res.status(200).json(new ApiResponse(200, 'Slot status retrieved', slots));
});

export default {
  getAll,
  getById,
  updateAvailability,
  updateFees,
  getDashboard,
  getBookedSlots,
  getSchedule,
  getScheduleCapacity,
  getSlotStatus,
  addScheduleSlot,
  removeScheduleSlot,
};
