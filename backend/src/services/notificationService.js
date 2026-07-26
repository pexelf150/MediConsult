import Notification from '../models/Notification.js';
import { emitToDoctor, emitToPatient } from '../config/socket.js';

export const createNotification = async ({
  recipientId,
  senderId = null,
  type,
  title,
  message,
  data = {},
}) => {
  const notification = await Notification.create({
    recipient: recipientId,
    sender: senderId,
    type,
    title,
    message,
    data,
  });

  return notification;
};

export const notifyDoctorUrgentAppointment = async (io, doctor, appointment, patient) => {
  const notification = await createNotification({
    recipientId: doctor._id,
    senderId: patient._id,
    type: 'urgent_appointment',
    title: 'Urgent Consultation Request',
    message: `Urgent case from ${patient.firstName} ${patient.lastName}. Symptoms: ${appointment.symptoms.slice(0, 100)}...`,
    data: {
      appointmentId: appointment._id,
      patientId: patient._id,
      meetingUrl: appointment.jitsi?.meetingUrl,
      type: 'urgent',
    },
  });

  if (io) {
    emitToDoctor(io, doctor._id.toString(), 'urgent:appointment', {
      notification,
      appointment: {
        id: appointment._id,
        symptoms: appointment.symptoms,
        severity: appointment.severity,
        patient: {
          id: patient._id,
          fullName: patient.fullName,
          phone: patient.phone,
        },
        jitsi: appointment.jitsi,
        createdAt: appointment.createdAt,
      },
    });
  }

  return notification;
};

export const notifyPatientAppointmentConfirmed = async (io, patient, appointment, doctor) => {
  const notification = await createNotification({
    recipientId: patient._id,
    senderId: doctor._id,
    type: 'appointment_confirmed',
    title: 'Appointment Confirmed',
    message: `Your ${appointment.type} consultation with Dr. ${doctor.lastName} has been confirmed.`,
    data: {
      appointmentId: appointment._id,
      meetingUrl: appointment.jitsi?.meetingUrl,
    },
  });

  if (io) {
    emitToPatient(io, patient._id.toString(), 'appointment:confirmed', {
      notification,
      appointment,
    });
  }

  return notification;
};

export const notifyDoctorAppointmentConfirmed = async (io, doctor, appointment, patient) => {
  const notification = await createNotification({
    recipientId: doctor._id,
    senderId: patient._id,
    type: 'appointment_confirmed',
    title: 'New Appointment Scheduled',
    message: `New normal appointment scheduled with ${patient.firstName} ${patient.lastName} on ${new Date(appointment.scheduledAt).toLocaleString()}`,
    data: {
      appointmentId: appointment._id,
      patientId: patient._id,
    },
  });

  if (io) {
    emitToDoctor(io, doctor._id.toString(), 'appointment:confirmed', {
      notification,
      appointment,
    });
  }

  return notification;
};

export const notifyPaymentSuccess = async (io, patient, payment, appointment) => {
  const notification = await createNotification({
    recipientId: patient._id,
    type: 'payment_success',
    title: 'Payment Successful',
    message: 'Your payment was successful. Your urgent consultation has been scheduled.',
    data: {
      paymentId: payment._id,
      appointmentId: appointment?._id,
      meetingUrl: appointment?.jitsi?.meetingUrl,
    },
  });

  if (io) {
    emitToPatient(io, patient._id.toString(), 'payment:success', {
      notification,
      appointment,
    });
  }

  return notification;
};

export const getUserNotifications = async (userId, { page = 1, limit = 20, unreadOnly = false }) => {
  const query = { recipient: userId };

  if (unreadOnly) {
    query.isRead = false;
  }

  const skip = (page - 1) * limit;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'firstName lastName role'),
    Notification.countDocuments(query),
    Notification.countDocuments({ recipient: userId, isRead: false }),
  ]);

  return {
    notifications,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
    unreadCount,
  };
};

export const markNotificationRead = async (notificationId, userId) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { isRead: true, readAt: new Date() },
    { new: true }
  );

  if (!notification) {
    throw new Error('Notification not found');
  }

  return notification;
};

export const markAllNotificationsRead = async (userId) => {
  await Notification.updateMany(
    { recipient: userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
};

export const notifyPatientAppointmentRescheduled = async (appointment, newDate, reason) => {
  const notification = await createNotification({
    recipientId: appointment.patient,
    senderId: appointment.doctor,
    type: 'appointment_rescheduled',
    title: 'Appointment Rescheduled',
    message: `Your appointment with Dr. ${appointment.doctor?.lastName || 'Doctor'} has been rescheduled to ${new Date(newDate).toLocaleString()}. ${reason ? `Reason: ${reason}` : ''}`,
    data: {
      appointmentId: appointment._id,
      newScheduledAt: newDate,
      reason,
    },
  });

  return notification;
};

export const notifyDoctorAppointmentRescheduled = async (appointment, newDate, reason) => {
  const notification = await createNotification({
    recipientId: appointment.doctor,
    senderId: appointment.patient,
    type: 'appointment_rescheduled',
    title: 'Appointment Rescheduled',
    message: `Patient ${appointment.patient?.firstName || 'Patient'} ${appointment.patient?.lastName || ''} has rescheduled their appointment to ${new Date(newDate).toLocaleString()}. ${reason ? `Reason: ${reason}` : ''}`,
    data: {
      appointmentId: appointment._id,
      newScheduledAt: newDate,
      reason,
    },
  });

  return notification;
};

export default {
  createNotification,
  notifyDoctorUrgentAppointment,
  notifyPatientAppointmentConfirmed,
  notifyDoctorAppointmentConfirmed,
  notifyPaymentSuccess,
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  notifyPatientAppointmentRescheduled,
  notifyDoctorAppointmentRescheduled,
};
