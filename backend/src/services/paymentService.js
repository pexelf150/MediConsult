import Payment from '../models/Payment.js';
import ApiError from '../utils/ApiError.js';
import { getStripe } from '../config/stripe.js';
import { completeAppointmentAfterPayment } from './appointmentService.js';

export const handleStripeWebhook = async (rawBody, signature, io) => {
  const stripe = getStripe();

  if (!stripe) {
    throw new ApiError(503, 'Stripe is not configured');
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    throw new ApiError(400, `Webhook signature verification failed: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    await processSuccessfulPayment(session, io);
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object;
    await Payment.findOneAndUpdate(
      { 'stripe.sessionId': session.id },
      { status: 'failed', failureReason: 'Checkout session expired' }
    );
  }

  return { received: true };
};

export const processSuccessfulPayment = async (session, io) => {
  const payment = await Payment.findOne({ 'stripe.sessionId': session.id });

  if (!payment) {
    throw new ApiError(404, 'Payment record not found');
  }

  if (payment.status === 'completed') {
    return payment;
  }

  payment.stripe.paymentIntentId = session.payment_intent;
  payment.status = 'completed';
  payment.paidAt = new Date();
  await payment.save();

  const appointment = await completeAppointmentAfterPayment(payment, io);

  return { payment, appointment };
};

export const verifyPaymentSession = async (sessionId, patientId, io) => {
  const stripe = getStripe();
  const payment = await Payment.findOne({
    'stripe.sessionId': sessionId,
    patient: patientId,
  });

  if (!payment) {
    throw new ApiError(404, 'Payment not found');
  }

  if (payment.status === 'completed' && payment.appointment) {
    return { payment, alreadyProcessed: true };
  }

  if (stripe) {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      throw new ApiError(400, 'Payment not completed');
    }

    payment.stripe.paymentIntentId = session.payment_intent;
  } else if (process.env.NODE_ENV === 'production') {
    throw new ApiError(503, 'Payment verification is not available');
  }

  payment.status = 'completed';
  payment.paidAt = new Date();
  await payment.save();

  const appointment = await completeAppointmentAfterPayment(payment, io);

  return { payment, appointment, alreadyProcessed: false };
};

export const simulatePaymentSuccess = async (paymentId, patientId, io) => {
  if (process.env.NODE_ENV === 'production') {
    throw new ApiError(403, 'Simulation endpoint is disabled in production');
  }

  const payment = await Payment.findOne({ _id: paymentId, patient: patientId });

  if (!payment) {
    throw new ApiError(404, 'Payment not found');
  }

  if (payment.status === 'completed') {
    return { payment, alreadyProcessed: true };
  }

  payment.status = 'completed';
  payment.paidAt = new Date();
  await payment.save();

  const appointment = await completeAppointmentAfterPayment(payment, io);

  return { payment, appointment };
};

export const getPaymentById = async (paymentId, patientId) => {
  const payment = await Payment.findOne({ _id: paymentId, patient: patientId }).populate(
    'appointment'
  );

  if (!payment) {
    throw new ApiError(404, 'Payment not found');
  }

  return payment;
};

export default {
  handleStripeWebhook,
  processSuccessfulPayment,
  verifyPaymentSession,
  simulatePaymentSuccess,
  getPaymentById,
};
