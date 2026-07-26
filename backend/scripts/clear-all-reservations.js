import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SlotReservation from '../src/models/SlotReservation.js';

dotenv.config();

const clearAllReservations = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const result = await SlotReservation.deleteMany({});
    console.log(`Deleted ${result.deletedCount} all reservations`);
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

clearAllReservations();
