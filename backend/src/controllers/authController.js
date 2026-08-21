import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import env from '../config/env.js';
import * as authService from '../services/authService.js';

const sendAuthResponse = (res, statusCode, message, result) => {
  authService.setAuthCookie(res, result.token);

  const payload = { user: result.user };
  if (env.nodeEnv !== 'production') {
    payload.token = result.token;
  }

  res.status(statusCode).json(new ApiResponse(statusCode, message, payload));
};

export const registerPatient = asyncHandler(async (req, res) => {
  const result = await authService.registerPatient(req.body);
  sendAuthResponse(res, 201, 'Patient registered successfully', result);
});

export const registerDoctor = asyncHandler(async (req, res) => {
  const result = await authService.registerDoctor(req.body);
  sendAuthResponse(res, 201, 'Doctor registered successfully', result);
});

export const loginPatient = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password, 'patient');
  sendAuthResponse(res, 200, 'Login successful', result);
});

export const loginDoctor = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password, 'doctor');
  sendAuthResponse(res, 200, 'Login successful', result);
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getProfile(req.user._id);

  res.status(200).json(new ApiResponse(200, 'Profile retrieved', { user }));
});

export const updateMe = asyncHandler(async (req, res) => {
  const user = await authService.updateProfile(req.user._id, req.body);

  res.status(200).json(new ApiResponse(200, 'Profile updated', { user }));
});

export const logout = asyncHandler(async (req, res) => {
  authService.clearAuthCookie(res);

  res.status(200).json(new ApiResponse(200, 'Logged out successfully'));
});

export const getGoogleAuthUrl = asyncHandler(async (req, res) => {
  const { redirectTo, role } = req.body;
  const result = await authService.getGoogleAuthUrl(redirectTo, role);

  res.status(200).json(new ApiResponse(200, 'Google Auth URL generated', result));
});

export const handleGoogleCallback = asyncHandler(async (req, res) => {
  const { code, state } = req.query;
  console.log('Google callback received with code and state:', { code: code?.substring(0, 20) + '...', state });
  
  const result = await authService.handleGoogleCallback(code, state);
  console.log('Google callback result:', { user: result.user, role: result.user.role });

  // Set auth cookie
  authService.setAuthCookie(res, result.token);

  // Redirect to frontend callback to handle localStorage and routing
  const redirectUrl = `${env.frontendUrl}/auth/callback`;
  console.log('Redirecting user to callback:', redirectUrl, 'with role:', result.user.role);
  res.redirect(redirectUrl);
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword(req.user._id, currentPassword, newPassword);

  res.status(200).json(new ApiResponse(200, 'Password changed successfully'));
});

export const deleteAccount = asyncHandler(async (req, res) => {
  const { password } = req.body;
  await authService.deleteAccount(req.user._id, password);

  // Clear auth cookie
  authService.clearAuthCookie(res);

  res.status(200).json(new ApiResponse(200, 'Account deleted successfully'));
});

export default {
  registerPatient,
  registerDoctor,
  loginPatient,
  loginDoctor,
  getMe,
  updateMe,
  logout,
  getGoogleAuthUrl,
  handleGoogleCallback,
  changePassword,
  deleteAccount,
};
