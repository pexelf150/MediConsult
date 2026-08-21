import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import Appointment from '../models/Appointment.js';
import Payment from '../models/Payment.js';
import Patient from '../models/Patient.js';
import User from '../models/User.js';

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

export const getProfile = asyncHandler(async (req, res) => {
  console.log('=== GET PROFILE CALLED ===');
  console.log('req.user:', req.user);
  const patientId = req.user._id;

  console.log('Fetching profile for patient ID:', patientId);

  const patient = await Patient.findById(patientId).select('-password');

  console.log('Found patient:', patient);
  console.log('Patient data:', patient ? {
    firstName: patient.firstName,
    lastName: patient.lastName,
    email: patient.email,
    phone: patient.phone,
    gender: patient.gender,
    dateOfBirth: patient.dateOfBirth,
    age: patient.age
  } : null);

  if (!patient) {
    console.log('Patient not found, returning 404');
    return res.status(404).json(new ApiResponse(404, 'Patient not found'));
  }

  console.log('Returning patient data');
  res.status(200).json(new ApiResponse(200, 'Patient profile retrieved', patient));
});

export const updateProfile = asyncHandler(async (req, res) => {
  console.log('=== UPDATE PROFILE CALLED ===');
  console.log('req.body:', req.body);
  const patientId = req.user._id;
  const { firstName, lastName, phone, gender, dateOfBirth, age } = req.body;

  // Clean phone number by removing spaces
  const cleanedPhone = phone ? phone.replace(/\s/g, '') : phone;

  console.log('Updating profile for patient ID:', patientId);
  console.log('Fields to update:', { firstName, lastName, phone: cleanedPhone, gender, dateOfBirth, age });

  const patient = await Patient.findById(patientId);

  if (!patient) {
    console.log('Patient not found, returning 404');
    return res.status(404).json(new ApiResponse(404, 'Patient not found'));
  }

  console.log('Current patient data:', {
    firstName: patient.firstName,
    lastName: patient.lastName,
    phone: patient.phone,
    gender: patient.gender,
    dateOfBirth: patient.dateOfBirth,
    age: patient.age
  });

  patient.firstName = firstName || patient.firstName;
  patient.lastName = lastName || patient.lastName;
  patient.phone = cleanedPhone || patient.phone;
  patient.gender = gender || patient.gender;
  patient.dateOfBirth = dateOfBirth || patient.dateOfBirth;
  patient.age = age || patient.age;

  console.log('Saving patient with new data:', {
    firstName: patient.firstName,
    lastName: patient.lastName,
    phone: patient.phone,
    gender: patient.gender,
    dateOfBirth: patient.dateOfBirth,
    age: patient.age
  });

  await patient.save();

  console.log('Patient saved successfully');
  res.status(200).json(new ApiResponse(200, 'Profile updated successfully', patient));
});

export default { getDashboard, getProfile, updateProfile };
