import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SlotReservation from '../src/models/SlotReservation.js';

dotenv.config();

const checkReservations = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const reservations = await SlotReservation.find({}).sort({ createdAt: -1 }).limit(10);
    
    console.log('Recent reservations:');
    reservations.forEach(r => {
      const now = new Date();
      const expires = new Date(r.expiresAt);
      const diff = (expires - now) / 1000;
      console.log({
        id: r._id,
        doctor: r.doctor,
        patient: r.patient,
        scheduledAt: r.scheduledAt,
        expiresAt: r.expiresAt,
        status: r.status,
        secondsUntilExpiry: Math.round(diff),
        isExpired: diff < 0
      });
    });
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkReservations();
