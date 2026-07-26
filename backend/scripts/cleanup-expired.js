import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SlotReservation from '../src/models/SlotReservation.js';

dotenv.config();

const cleanupExpired = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const result = await SlotReservation.deleteMany({
      status: 'reserved',
      expiresAt: { $lt: new Date() },
    });
    
    console.log(`Deleted ${result.deletedCount} expired reservations`);
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

cleanupExpired();
