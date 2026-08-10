import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'inr',
      lowercase: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
    provider: {
      type: String,
      enum: ['stripe', 'manual'],
      default: 'stripe',
    },
    stripe: {
      sessionId: { type: String, default: null, index: true },
      paymentIntentId: { type: String, default: null },
      customerId: { type: String, default: null },
    },
    metadata: {
      symptoms: String,
      appointmentType: { type: String, enum: ['urgent', 'normal'] },
      doctorId: String,
      reservationId: String,
      scheduledAt: String,
      severity: String,
      cholesterol: Number,
      sugar: Number,
      bloodPressure: String,
      contactPhone: String,
      bloodGroup: String,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    failureReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
