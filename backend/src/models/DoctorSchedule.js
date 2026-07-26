import mongoose from 'mongoose';

const doctorScheduleSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    dayOfWeek: {
      type: Number,
      required: true,
      min: 0,
      max: 6,
    },
    startTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
    endTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
    slotMinutes: {
      type: Number,
      required: true,
      min: 5,
      max: 120,
      default: 30,
    },
    maxAppointments: {
      type: Number,
      default: 10,
      min: 1,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
);

doctorScheduleSchema.index({ doctor: 1, dayOfWeek: 1, startTime: 1 });

const DoctorSchedule = mongoose.model('DoctorSchedule', doctorScheduleSchema);

export default DoctorSchedule;
