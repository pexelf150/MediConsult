import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import * as paymentService from '../services/paymentService.js';

export const stripeWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['stripe-signature'];
  const io = req.app.get('io');

  const result = await paymentService.handleStripeWebhook(req.body, signature, io);

  res.status(200).json(result);
});

export const verifySession = asyncHandler(async (req, res) => {
  const { sessionId } = req.body;
  const io = req.app.get('io');

  const result = await paymentService.verifyPaymentSession(sessionId, req.user._id, io);

  res.status(200).json(new ApiResponse(200, 'Payment verified', result));
});

export const simulateSuccess = asyncHandler(async (req, res) => {
  const io = req.app.get('io');

  const result = await paymentService.simulatePaymentSuccess(req.params.id, req.user._id, io);

  res.status(200).json(new ApiResponse(200, 'Payment simulated successfully', result));
});

export const getPayment = asyncHandler(async (req, res) => {
  const payment = await paymentService.getPaymentById(req.params.id, req.user._id);

  res.status(200).json(new ApiResponse(200, 'Payment retrieved', { payment }));
});

export default {
  stripeWebhook,
  verifySession,
  simulateSuccess,
  getPayment,
};
