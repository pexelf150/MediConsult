import Payment from '../models/Payment.js';
import ApiError from '../utils/ApiError.js';
import { completeAppointmentAfterPayment } from './appointmentService.js';

const MPGS_CONFIG = {
  bankUrl: process.env.MPGS_BANK_URL || 'https://test-seylan.mtf.gateway.mastercard.com',
  merchantId: process.env.MPGS_MERCHANT_ID,
  apiPassword: process.env.MPGS_API_PASSWORD,
  apiVersion: process.env.MPGS_API_VERSION || '100',
  currency: process.env.MPGS_CURRENCY || 'LKR',
};

// Helper to get Basic Auth header
const getAuthHeader = () => {
  const credentials = Buffer.from(
    `merchant.${MPGS_CONFIG.merchantId}:${MPGS_CONFIG.apiPassword}`
  ).toString('base64');
  return `Basic ${credentials}`;
};

export const createMPGSSession = async (paymentData) => {
  const { orderId } = paymentData;

  const requestBody = {
    apiOperation: 'CREATE_CHECKOUT_SESSION',
  };

  try {
    const url = `${MPGS_CONFIG.bankUrl}/api/rest/version/${MPGS_CONFIG.apiVersion}/merchant/${MPGS_CONFIG.merchantId}/session`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthHeader(),
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (data.result !== 'SUCCESS') {
      throw new ApiError(400, `Failed to create MPGS session: ${data.error?.explanation || data.error?.cause || 'Unknown error'}`);
    }

    return {
      sessionId: data.session.id,
      orderId,
      merchantId: MPGS_CONFIG.merchantId,
      bankUrl: MPGS_CONFIG.bankUrl,
      apiVersion: MPGS_CONFIG.apiVersion,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, `MPGS session creation failed: ${error.message}`);
  }
};

export const retrieveMPGSOrder = async (orderId) => {
  try {
    const response = await fetch(
      `${MPGS_CONFIG.bankUrl}/api/rest/version/${MPGS_CONFIG.apiVersion}/merchant/${MPGS_CONFIG.merchantId}/order/${orderId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': getAuthHeader(),
        },
      }
    );

    const data = await response.json();

    if (data.result !== 'SUCCESS') {
      throw new ApiError(400, `Failed to retrieve MPGS order: ${data.error?.explanation || 'Unknown error'}`);
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, `MPGS order retrieval failed: ${error.message}`);
  }
};

export const processMPGSPayment = async (orderId, sessionId, io) => {
  const payment = await Payment.findOne({ 'mpgs.sessionId': sessionId });

  if (!payment) {
    throw new ApiError(404, 'Payment record not found');
  }

  if (payment.status === 'completed') {
    return { payment, alreadyProcessed: true };
  }

  const orderData = await retrieveMPGSOrder(orderId);

  // Check if order was successfully captured
  if (orderData.status !== 'CAPTURED') {
    payment.status = 'failed';
    payment.failureReason = `Order status: ${orderData.status}`;
    await payment.save();
    throw new ApiError(400, `Payment not successful. Order status: ${orderData.status}`);
  }

  payment.mpgs.orderId = orderId;
  payment.mpgs.transactionId = orderData.transaction?.[0]?.transactionId;
  payment.status = 'completed';
  payment.paidAt = new Date();
  await payment.save();

  const appointment = await completeAppointmentAfterPayment(payment, io);

  return { payment, appointment, alreadyProcessed: false };
};

export const createMPGSPayment = async (paymentData, io) => {
  const { patient, amount, metadata, currency } = paymentData;

  const orderId = `ORD-${Date.now()}`;

  // Create payment record
  const payment = await Payment.create({
    patient,
    amount,
    currency: currency || MPGS_CONFIG.currency,
    status: 'pending',
    provider: 'mpgs',
    metadata,
  });

  // Create MPGS session
  const sessionData = await createMPGSSession({
    orderId,
  });

  // Update payment with session data
  payment.mpgs.sessionId = sessionData.sessionId;
  payment.mpgs.orderId = orderId;
  await payment.save();

  return {
    payment,
    sessionId: sessionData.sessionId,
    orderId,
    merchantId: sessionData.merchantId,
    bankUrl: sessionData.bankUrl,
    apiVersion: sessionData.apiVersion,
  };
};

export default {
  createMPGSSession,
  retrieveMPGSOrder,
  processMPGSPayment,
  createMPGSPayment,
};
