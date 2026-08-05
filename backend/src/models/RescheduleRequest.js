import mongoose from 'mongoose';

const rescheduleRequestSchema = new mongoose.Schema(
  {
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    requestedBy: {
      type: String,
      enum: ['patient', 'doctor'],
      required: true,
    },
    originalScheduledAt: {
      type: Date,
      required: true,
    },
    requestedScheduledAt: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

rescheduleRequestSchema.index({ doctor: 1, status: 1, createdAt: -1 });
rescheduleRequestSchema.index({ patient: 1, status: 1, createdAt: -1 });
rescheduleRequestSchema.index({ appointment: 1 });

const RescheduleRequest = mongoose.model('RescheduleRequest', rescheduleRequestSchema);

export default RescheduleRequest;
