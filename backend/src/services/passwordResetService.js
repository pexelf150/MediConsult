import crypto from 'crypto';
import User from '../models/User.js';
import PasswordReset from '../models/PasswordReset.js';
import ApiError from '../utils/ApiError.js';
import { sendVerificationEmail } from '../config/email.js';

export const requestPasswordReset = async (email) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, 'No account found with this email address');
  }

  // Generate a 6-digit verification code
  const code = crypto.randomInt(100000, 999999).toString();

  // Invalidate any existing codes for this email
  await PasswordReset.updateMany(
    { email },
    { used: true }
  );

  // Create new password reset record
  await PasswordReset.create({
    email,
    code,
  });

  // Send email
  const emailResult = await sendVerificationEmail(email, code);

  return { 
    success: true, 
    message: 'Verification code sent successfully',
    devMode: emailResult.devMode 
  };
};

export const verifyResetCode = async (email, code) => {
  const resetRecord = await PasswordReset.findOne({
    email: email.toLowerCase(),
    code,
    used: false,
    expiresAt: { $gt: new Date() },
  });

  if (!resetRecord) {
    throw new ApiError(400, 'Invalid or expired verification code');
  }

  return { success: true, message: 'Code verified successfully' };
};

export const resetPassword = async (email, code, newPassword) => {
  const resetRecord = await PasswordReset.findOne({
    email: email.toLowerCase(),
    code,
    used: false,
    expiresAt: { $gt: new Date() },
  });

  if (!resetRecord) {
    throw new ApiError(400, 'Invalid or expired verification code');
  }

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Update password
  user.password = newPassword;
  await user.save();

  // Mark code as used
  resetRecord.used = true;
  await resetRecord.save();

  return { success: true, message: 'Password reset successfully' };
};

export default {
  requestPasswordReset,
  verifyResetCode,
  resetPassword,
};
