import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const dropUniqueIndex = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const collection = mongoose.connection.collection('slotreservations');
    
    // Get all indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes);
    
    // Drop the unique index if it exists
    const uniqueIndex = indexes.find(idx => 
      idx.name === 'doctor_1_scheduledAt_1' && idx.unique === true
    );
    
    if (uniqueIndex) {
      console.log('Found unique index:', uniqueIndex.name);
      await collection.dropIndex(uniqueIndex.name);
      console.log('Unique index dropped successfully');
    } else {
      console.log('No unique index found on doctor_1_scheduledAt_1');
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

dropUniqueIndex();
