import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';

export const generateRoomName = (appointmentId) => {
  const sanitizedId = appointmentId.toString().slice(-12);
  return `MediConsult-${sanitizedId}-${uuidv4().slice(0, 8)}`;
};

export const buildMeetingUrl = (roomName) => {
  return `https://${env.jitsi.domain}/${roomName}`;
};

export const generateJitsiJwt = (roomName, user, isModerator = false) => {
  if (!env.jitsi.useJwt || !env.jitsi.appId || !env.jitsi.appSecret) {
    return null;
  }

  const payload = {
    aud: 'jitsi',
    iss: env.jitsi.appId,
    sub: env.jitsi.domain,
    room: roomName,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 2,
    context: {
      user: {
        id: user._id.toString(),
        name: user.fullName || `${user.firstName} ${user.lastName}`,
        email: user.email,
        moderator: isModerator ? 'true' : 'false',
      },
    },
  };

  return jwt.sign(payload, env.jitsi.appSecret, { algorithm: 'HS256' });
};

export const createMeetingForAppointment = (appointmentId, doctor, patient) => {
  const roomName = generateRoomName(appointmentId);
  const meetingUrl = buildMeetingUrl(roomName);

  const doctorJwt = generateJitsiJwt(roomName, doctor, true);
  const patientJwt = generateJitsiJwt(roomName, patient, false);

  const buildUrlWithJwt = (baseUrl, token) => {
    if (!token) return baseUrl;
    return `${baseUrl}?jwt=${token}`;
  };

  return {
    roomName,
    meetingUrl,
    jwtToken: doctorJwt,
    doctorMeetingUrl: buildUrlWithJwt(meetingUrl, doctorJwt),
    patientMeetingUrl: buildUrlWithJwt(meetingUrl, patientJwt),
  };
};

export const getMeetingJoinUrl = (appointment, userRole) => {
  if (!appointment.jitsi?.meetingUrl) {
    throw new ApiError(404, 'Meeting not yet created for this appointment');
  }

  const baseUrl = appointment.jitsi.meetingUrl;

  if (!env.jitsi.useJwt) {
    return baseUrl;
  }

  if (userRole === 'doctor' && appointment.jitsi.jwtToken) {
    return `${baseUrl}?jwt=${appointment.jitsi.jwtToken}`;
  }

  return baseUrl;
};

export default {
  generateRoomName,
  buildMeetingUrl,
  generateJitsiJwt,
  createMeetingForAppointment,
  getMeetingJoinUrl,
};
