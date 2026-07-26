import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SlotReservation from '../src/models/SlotReservation.js';

dotenv.config();

const dropTTLIndex = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const collection = mongoose.connection.collection('slotreservations');
    
    // Get all indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes);
    
    // Drop the TTL index on expiresAt if it exists
    const ttlIndex = indexes.find(idx => idx.key?.expiresAt === 1 && idx.expireAfterSeconds !== undefined);
    
    if (ttlIndex) {
      console.log('Found TTL index:', ttlIndex.name);
      await collection.dropIndex(ttlIndex.name);
      console.log('TTL index dropped successfully');
    } else {
      console.log('No TTL index found on expiresAt field');
    }
    
    // Verify indexes after dropping
    const finalIndexes = await collection.indexes();
    console.log('Final indexes:', finalIndexes);
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

dropTTLIndex();
