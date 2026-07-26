import mongoose from 'mongoose';
import User from './User.js';

const doctorSchema = new mongoose.Schema({
  specialization: {
    type: String,
    required: [true, 'Specialization is required'],
    trim: true,
  },
  licenseNumber: {
    type: String,
    required: [true, 'Medical license number is required'],
    unique: true,
    trim: true,
  },
  qualifications: [
    {
      degree: String,
      institution: String,
      year: Number,
    },
  ],
  experienceYears: {
    type: Number,
    default: 0,
    min: 0,
  },
  consultationFee: {
    type: Number,
    default: 2500,
    min: 0,
  },
  urgentFee: {
    type: Number,
    default: 5000,
    min: 0,
  },
  bio: {
    type: String,
    maxlength: 1000,
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  availability: {
    monday: { start: String, end: String, available: { type: Boolean, default: true } },
    tuesday: { start: String, end: String, available: { type: Boolean, default: true } },
    wednesday: { start: String, end: String, available: { type: Boolean, default: true } },
    thursday: { start: String, end: String, available: { type: Boolean, default: true } },
    friday: { start: String, end: String, available: { type: Boolean, default: true } },
    saturday: { start: String, end: String, available: { type: Boolean, default: false } },
    sunday: { start: String, end: String, available: { type: Boolean, default: false } },
  },
  rating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 },
  },
});

const Doctor = User.discriminator('doctor', doctorSchema);

export default Doctor;
