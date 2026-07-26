import mongoose from 'mongoose';

const slotReservationSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    scheduledAt: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['reserved', 'confirmed', 'released', 'expired'],
      default: 'reserved',
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const SlotReservation = mongoose.model('SlotReservation', slotReservationSchema);

export default SlotReservation;
