import mongoose from 'mongoose';
import User from './User.js';

const patientSchema = new mongoose.Schema({
  dateOfBirth: {
    type: Date,
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer_not_to_say'],
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', null],
    default: null,
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'India' },
  },
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String,
  },
  medicalHistory: [
    {
      condition: String,
      diagnosedDate: Date,
      notes: String,
    },
  ],
});

const Patient = User.discriminator('patient', patientSchema);

export default Patient;
