import { signToken, getCookieOptions } from '../config/jwt.js';
import ApiError from '../utils/ApiError.js';
import env from '../config/env.js';
import User from '../models/User.js';
import '../models/Patient.js';
import '../models/Doctor.js';

const buildAuthResponse = (user) => {
  const token = signToken({ id: user._id, role: user.role });

  return {
    token,
    user: {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      role: user.role,
      phone: user.phone,
      avatar: user.avatar,
    },
  };
};

export const registerPatient = async (userData) => {
  const existingUser = await User.findOne({ email: userData.email });

  if (existingUser) {
    throw new ApiError(409, 'Email already registered');
  }

  const patient = await User.create({
    ...userData,
    role: 'patient',
  });

  return buildAuthResponse(patient);
};

export const registerDoctor = async (userData) => {
  const existingUser = await User.findOne({
    $or: [{ email: userData.email }, { licenseNumber: userData.licenseNumber }],
  });

  if (existingUser) {
    throw new ApiError(409, 'Email or license number already registered');
  }

  const doctor = await User.create({
    ...userData,
    role: 'doctor',
  });

  return buildAuthResponse(doctor);
};

export const login = async (email, password, expectedRole) => {
  const user = await User.findOne({ email, role: expectedRole }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Your account has been deactivated');
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  return buildAuthResponse(user);
};

export const getProfile = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return user;
};

export const updateProfile = async (userId, updates) => {
  const disallowedFields = [
    'password',
    'role',
    'email',
    'licenseNumber',
    'isActive',
    'lastLogin',
    '_id',
    'id',
  ];
  const filteredUpdates = { ...updates };

  disallowedFields.forEach((field) => delete filteredUpdates[field]);

  const user = await User.findByIdAndUpdate(userId, filteredUpdates, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return user;
};

export const setAuthCookie = (res, token) => {
  res.cookie('token', token, getCookieOptions());
};

export const clearAuthCookie = (res) => {
  res.clearCookie('token', getCookieOptions());
};

export const getGoogleAuthUrl = (redirectTo, role = 'patient') => {
  if (!env.google.clientId || !env.google.clientSecret) {
    throw new ApiError(500, 'Google OAuth is not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your environment variables.');
  }

  const googleAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  const scope = 'email profile';
  const state = Math.random().toString(36).substring(7) + `|${role}`;

  const params = new URLSearchParams({
    client_id: env.google.clientId,
    redirect_uri: `${env.backendUrl}/api/auth/google/callback`,
    response_type: 'code',
    scope,
    state,
    access_type: 'offline',
    prompt: 'consent',
  });

  return {
    url: `${googleAuthUrl}?${params.toString()}`,
    state,
  };
};

export const handleGoogleCallback = async (code, state) => {
  console.log('Google OAuth callback received:', { code: code.substring(0, 20) + '...', state });

  // Extract role from state if present
  let requestedRole = 'patient';
  if (state && state.includes('|')) {
    const parts = state.split('|');
    if (parts.length > 1) {
      requestedRole = parts[1];
    }
  }

  // Exchange code for tokens
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.google.clientId,
      client_secret: env.google.clientSecret,
      redirect_uri: `${env.backendUrl}/api/auth/google/callback`,
      grant_type: 'authorization_code',
    }),
  });

  const tokenData = await tokenResponse.json();

  if (tokenData.error) {
    console.error('Google OAuth token exchange error:', tokenData);
    // If the code was already used, it means the callback was called twice
    // This is a known issue with OAuth redirects - we should handle it gracefully
    if (tokenData.error === 'invalid_grant') {
      throw new ApiError(400, 'Authorization code has already been used. Please try the authentication flow again.');
    }
    throw new ApiError(400, `Failed to exchange authorization code for tokens: ${tokenData.error_description || tokenData.error}`);
  }

  // Get user info from Google
  const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  const googleUser = await userResponse.json();

  // Check if user exists
  let user = await User.findOne({ email: googleUser.email });

  if (!user) {
    // User does not exist - create new user based on requested role
    console.log('Creating new user for Google OAuth:', { email: googleUser.email, requestedRole });
    
    if (requestedRole === 'doctor') {
      // For doctors, we need additional info, so redirect to complete profile
      const newUser = await User.create({
        email: googleUser.email,
        firstName: googleUser.given_name || 'Doctor',
        lastName: googleUser.family_name || '',
        fullName: googleUser.name || 'Doctor',
        avatar: googleUser.picture,
        role: 'doctor',
        isActive: true,
        googleId: googleUser.id,
        specialization: 'General Practitioner',
        licenseNumber: 'GOOGLE-' + Date.now(),
      });
      
      console.log('Created new doctor user:', { _id: newUser._id, email: newUser.email, role: newUser.role });
      
      return {
        ...buildAuthResponse(newUser),
        isNewUser: true,
      };
    } else {
      // For patients, create directly
      const newUser = await User.create({
        email: googleUser.email,
        firstName: googleUser.given_name || 'Patient',
        lastName: googleUser.family_name || '',
        fullName: googleUser.name || 'Patient',
        avatar: googleUser.picture,
        role: 'patient',
        isActive: true,
        googleId: googleUser.id,
      });
      
      console.log('Created new patient user:', { _id: newUser._id, email: newUser.email, role: newUser.role });
      
      return {
        ...buildAuthResponse(newUser),
        isNewUser: false,
      };
    }
  }

  // Validate that the user's role matches the requested role
  if (user.role !== requestedRole) {
    throw new ApiError(403, `This account is registered as a ${user.role}. Please sign in using the ${user.role} option.`);
  }

  // User exists, check if they're active
  if (!user.isActive) {
    throw new ApiError(403, 'Your account has been deactivated');
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  return {
    ...buildAuthResponse(user),
    isNewUser: false,
  };
};

export const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Check if current password is correct
  if (!(await user.comparePassword(currentPassword))) {
    throw new ApiError(401, 'Incorrect current password');
  }

  // Update password
  user.password = newPassword;
  await user.save();
  return user;
};

export default {
  registerPatient,
  registerDoctor,
  login,
  getProfile,
  updateProfile,
  setAuthCookie,
  clearAuthCookie,
  getGoogleAuthUrl,
  handleGoogleCallback,
  changePassword,
};
