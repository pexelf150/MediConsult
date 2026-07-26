import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import '../models/Patient.js';
import '../models/Doctor.js';
import User from '../models/User.js';

dotenv.config();

const seed = async () => {
  await connectDB();

  await User.deleteMany({});

  const doctors = await User.create([
    {
      email: 'doctor1@mediconsult.com',
      password: 'Doctor@123',
      role: 'doctor',
      firstName: 'Rajesh',
      lastName: 'Sharma',
      phone: '+919876543210',
      specialization: 'General Physician',
      licenseNumber: 'MCI-2024-001',
      experienceYears: 12,
      consultationFee: 500,
      isAvailable: true,
      bio: 'Experienced general physician specializing in urgent care and chronic disease management.',
    },
    {
      email: 'doctor2@mediconsult.com',
      password: 'Doctor@123',
      role: 'doctor',
      firstName: 'Priya',
      lastName: 'Patel',
      phone: '+919876543211',
      specialization: 'Cardiologist',
      licenseNumber: 'MCI-2024-002',
      experienceYears: 8,
      consultationFee: 800,
      isAvailable: true,
      bio: 'Cardiologist with expertise in preventive heart care and telemedicine consultations.',
    },
  ]);

  const patients = await User.create([
    {
      email: 'patient1@mediconsult.com',
      password: 'Patient@123',
      role: 'patient',
      firstName: 'Amit',
      lastName: 'Kumar',
      phone: '+919123456789',
      gender: 'male',
      dateOfBirth: new Date('1990-05-15'),
    },
    {
      email: 'patient2@mediconsult.com',
      password: 'Patient@123',
      role: 'patient',
      firstName: 'Sneha',
      lastName: 'Reddy',
      phone: '+919123456790',
      gender: 'female',
      dateOfBirth: new Date('1985-11-22'),
    },
  ]);

  console.log('Database seeded successfully!');
  console.log('\nDoctor accounts:');
  doctors.forEach((d) => console.log(`  ${d.email} / Doctor@123`));
  console.log('\nPatient accounts:');
  patients.forEach((p) => console.log(`  ${p.email} / Patient@123`));

  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
