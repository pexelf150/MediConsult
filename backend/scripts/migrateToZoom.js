import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Appointment from '../src/models/Appointment.js';
import { createZoomMeeting } from '../src/services/zoomService.js';
import { getDoctorById } from '../src/services/doctorService.js';
import User from '../src/models/User.js';

dotenv.config();

const migrateAppointmentsToZoom = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all appointments with jitsi data
    const appointments = await Appointment.find({ 
      'jitsi.meetingUrl': { $exists: true, $ne: null },
      status: { $nin: ['cancelled', 'completed'] }
    }).populate('doctor patient');

    console.log(`Found ${appointments.length} appointments with Jitsi meetings to migrate`);

    let successCount = 0;
    let errorCount = 0;

    for (const appointment of appointments) {
      try {
        console.log(`\nMigrating appointment ${appointment._id}...`);

        // Create Zoom meeting
        const meeting = await createZoomMeeting({
          appointmentId: appointment._id,
          doctor: appointment.doctor,
          patient: appointment.patient,
          scheduledAt: appointment.scheduledAt,
        });

        // Update appointment with Zoom data
        appointment.zoom = {
          meetingId: meeting.meetingId,
          meetingUrl: meeting.meetingUrl,
          meetingPassword: meeting.meetingPassword,
          startUrl: meeting.startUrl,
          joinUrl: meeting.joinUrl,
          startTime: meeting.startTime,
          duration: meeting.duration,
          topic: meeting.topic,
        };

        // Remove Jitsi data
        appointment.jitsi = undefined;

        await appointment.save();

        console.log(`✓ Successfully migrated appointment ${appointment._id}`);
        successCount++;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`✗ Failed to migrate appointment ${appointment._id}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n\nMigration complete:`);
    console.log(`- Successfully migrated: ${successCount}`);
    console.log(`- Failed: ${errorCount}`);
    console.log(`- Total: ${appointments.length}`);

    process.exit(0);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrateAppointmentsToZoom();
