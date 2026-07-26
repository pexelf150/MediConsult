import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
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
    type: {
      type: String,
      enum: ['urgent', 'normal'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        'pending_payment',
        'scheduled',
        'confirmed',
        'in_progress',
        'completed',
        'cancelled',
        'no_show',
      ],
      default: 'scheduled',
      index: true,
    },
    symptoms: {
      type: String,
      required: [true, 'Symptoms description is required'],
      maxlength: 2000,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    contactPhone: {
      type: String,
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    healthMetrics: {
      cholesterol: {
        value: Number,
        level: { type: String, enum: ['low', 'normal', 'high'] },
      },
      sugar: {
        value: Number,
        level: { type: String, enum: ['low', 'normal', 'high'] },
      },
      bloodPressure: {
        value: String,
        level: { type: String, enum: ['low', 'normal', 'high'] },
      },
    },
    scheduledAt: {
      type: Date,
      default: null,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    doctorApproved: {
      type: Boolean,
      default: false,
    },
    duration: {
      type: Number,
      default: 30,
    },
    jitsi: {
      roomName: { type: String, default: null },
      meetingUrl: { type: String, default: null },
      jwtToken: { type: String, default: null, select: false },
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },
    prescription: {
      medications: [
        {
          name: String,
          dosage: String,
          frequency: String,
          duration: String,
          instructions: String,
        },
      ],
      notes: String,
      issuedAt: Date,
    },
    diagnosis: {
      type: String,
      maxlength: 2000,
    },
    doctorNotes: {
      type: String,
      maxlength: 2000,
    },
    cancellationReason: {
      type: String,
      maxlength: 500,
    },
    cancelledBy: {
      type: String,
      enum: ['patient', 'doctor', 'system'],
    },
    rescheduleHistory: [
      {
        originalScheduledAt: Date,
        newScheduledAt: Date,
        rescheduledBy: {
          type: String,
          enum: ['patient', 'doctor'],
        },
        rescheduledAt: {
          type: Date,
          default: Date.now,
        },
        reason: String,
      },
    ],
    isRescheduled: {
      type: Boolean,
      default: false,
    },
    rescheduleRequestedBy: {
      type: String,
      enum: ['patient', 'doctor'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

appointmentSchema.index({ patient: 1, createdAt: -1 });
appointmentSchema.index({ doctor: 1, status: 1, scheduledAt: 1 });
appointmentSchema.index({ type: 1, status: 1 });

const Appointment = mongoose.model('Appointment', appointmentSchema);

export default Appointment;
