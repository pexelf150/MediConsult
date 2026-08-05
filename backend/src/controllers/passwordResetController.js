import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import * as passwordResetService from '../services/passwordResetService.js';

export const requestReset = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new Error('Email is required');
  }

  const result = await passwordResetService.requestPasswordReset(email);

  res.status(200).json(new ApiResponse(200, result.message, result));
});

export const verifyCode = asyncHandler(async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    throw new Error('Email and code are required');
  }

  const result = await passwordResetService.verifyResetCode(email, code);

  res.status(200).json(new ApiResponse(200, result.message, result));
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    throw new Error('Email, code, and new password are required');
  }

  if (newPassword.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  const result = await passwordResetService.resetPassword(email, code, newPassword);

  res.status(200).json(new ApiResponse(200, result.message, result));
});

export default {
  requestReset,
  verifyCode,
  resetPassword,
};
