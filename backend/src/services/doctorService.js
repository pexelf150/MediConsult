import Doctor from '../models/Doctor.js';
import ApiError from '../utils/ApiError.js';

export const findAvailableDoctor = async (specialization = null) => {
  const query = {
    role: 'doctor',
    isActive: true,
    isAvailable: true,
  };

  if (specialization) {
    query.specialization = new RegExp(specialization, 'i');
  }

  const doctors = await Doctor.find(query).sort({ 'rating.average': -1, experienceYears: -1 });

  if (doctors.length === 0) {
    throw new ApiError(503, 'No doctors are currently available. Please try again later.');
  }

  return doctors[0];
};

export const getAllDoctors = async ({ specialization, available, page = 1, limit = 10 }) => {
  const query = { role: 'doctor', isActive: true };

  if (specialization) {
    query.specialization = new RegExp(specialization, 'i');
  }

  if (available !== undefined) {
    query.isAvailable = available === 'true' || available === true;
  }

  const skip = (page - 1) * limit;

  const [doctors, total] = await Promise.all([
    Doctor.find(query)
      .select('-password')
      .sort({ 'rating.average': -1 })
      .skip(skip)
      .limit(limit),
    Doctor.countDocuments(query),
  ]);

  return {
    doctors,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

export const getDoctorById = async (doctorId) => {
  const doctor = await Doctor.findOne({ _id: doctorId, role: 'doctor', isActive: true }).select(
    '-password'
  );

  if (!doctor) {
    throw new ApiError(404, 'Doctor not found');
  }

  return doctor;
};

export const updateDoctorAvailability = async (doctorId, isAvailable) => {
  const doctor = await Doctor.findOneAndUpdate(
    { _id: doctorId, role: 'doctor' },
    { isAvailable },
    { new: true }
  ).select('-password');

  if (!doctor) {
    throw new ApiError(404, 'Doctor not found');
  }

  return doctor;
};

export const updateDoctorFees = async (doctorId, { consultationFee, urgentFee }) => {
  const updates = {};
  if (consultationFee !== undefined) updates.consultationFee = Number(consultationFee);
  if (urgentFee !== undefined) updates.urgentFee = Number(urgentFee);

  const doctor = await Doctor.findOneAndUpdate(
    { _id: doctorId, role: 'doctor' },
    updates,
    { new: true, runValidators: true }
  ).select('-password');

  if (!doctor) {
    throw new ApiError(404, 'Doctor not found');
  }

  return doctor;
};

export default {
  findAvailableDoctor,
  getAllDoctors,
  getDoctorById,
  updateDoctorAvailability,
  updateDoctorFees,
};
