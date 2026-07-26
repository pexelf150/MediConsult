import User from '../models/User.js';
import { verifyToken } from './jwt.js';

const parseCookieToken = (cookieHeader) => {
  if (!cookieHeader) return null;

  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [key, ...rest] = part.trim().split('=');
    if (key === 'token') {
      return decodeURIComponent(rest.join('='));
    }
  }

  return null;
};

const doctorSockets = new Map();

export const initializeSocket = (io) => {
  io.use(async (socket, next) => {
    const token =
      socket.handshake.auth?.token || parseCookieToken(socket.handshake.headers.cookie);

    if (!token) {
      return next(new Error('Authentication required for socket connection'));
    }

    try {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id);

      if (!user || !user.isActive) {
        return next(new Error('User not found or inactive'));
      }

      if (decoded.role !== user.role) {
        return next(new Error('Invalid token role'));
      }

      socket.userId = user._id.toString();
      socket.role = user.role;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    if (socket.role === 'doctor') {
      doctorSockets.set(socket.userId, socket.id);
      socket.join(`doctor:${socket.userId}`);
    }

    if (socket.role === 'patient') {
      socket.join(`patient:${socket.userId}`);
    }

    socket.on('disconnect', () => {
      if (socket.role === 'doctor') {
        doctorSockets.delete(socket.userId);
      }
    });
  });
};

export const emitToDoctor = (io, doctorId, event, data) => {
  io.to(`doctor:${doctorId}`).emit(event, data);
};

export const emitToPatient = (io, patientId, event, data) => {
  io.to(`patient:${patientId}`).emit(event, data);
};

export default { initializeSocket, emitToDoctor, emitToPatient };
