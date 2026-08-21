import { body, param, query } from 'express-validator';

export const patientRegisterValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and a number'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('phone').optional({ values: 'falsy' }).isMobilePhone('any').withMessage('Valid phone number required'),
  body('dateOfBirth').optional().isISO8601().withMessage('Valid date of birth required'),
  body('gender')
    .optional()
    .isIn(['male', 'female', 'other', 'prefer_not_to_say'])
    .withMessage('Invalid gender'),
];

export const doctorRegisterValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and a number'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('specialization').trim().notEmpty().withMessage('Specialization is required'),
  body('licenseNumber').trim().notEmpty().withMessage('License number is required'),
  body('phone').optional({ values: 'falsy' }).isMobilePhone('any').withMessage('Valid phone number required'),
  body('experienceYears').optional().isInt({ min: 0 }).withMessage('Experience must be non-negative'),
  body('consultationFee').optional().isFloat({ min: 0 }).withMessage('Consultation fee must be non-negative'),
];

export const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const normalAppointmentValidation = [
  body('symptoms').trim().notEmpty().withMessage('Symptoms are required').isLength({ max: 2000 }),
  body('doctorId').optional().isMongoId().withMessage('Invalid doctor ID'),
  body('scheduledAt').optional().isISO8601().withMessage('Valid scheduled date required'),
  body('severity').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid severity'),
  body('contactPhone').trim().notEmpty().withMessage('Contact phone number is required').isMobilePhone('any').withMessage('Valid phone number required'),
  body('bloodGroup').optional().isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).withMessage('Invalid blood group'),
];

export const urgentAppointmentValidation = [
  body('symptoms').trim().notEmpty().withMessage('Symptoms are required').isLength({ max: 2000 }),
  body('severity').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid severity'),
  body('contactPhone').trim().notEmpty().withMessage('Contact phone number is required').isMobilePhone('any').withMessage('Valid phone number required'),
];

export const appointmentIdValidation = [
  param('id').isMongoId().withMessage('Invalid appointment ID'),
];

export const paymentIdValidation = [
  param('id').isMongoId().withMessage('Invalid payment ID'),
];

export const updateAppointmentStatusValidation = [
  param('id').isMongoId().withMessage('Invalid appointment ID'),
  body('status')
    .optional()
    .isIn(['confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'])
    .withMessage('Invalid status'),
  body('diagnosis').optional().isLength({ max: 2000 }),
  body('doctorNotes').optional().isLength({ max: 2000 }),
  body('cancellationReason').optional().isLength({ max: 500 }),
  body('prescription').optional(),
  body('doctorApproved').optional().isBoolean().withMessage('doctorApproved must be a boolean'),
];

export const cancelAppointmentValidation = [
  param('id').isMongoId().withMessage('Invalid appointment ID'),
  body('reason').optional().isLength({ max: 500 }),
];

export const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];

export const updateProfileValidation = [
  body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
  body('phone').optional({ values: 'falsy' }).isMobilePhone('any').withMessage('Valid phone number required'),
  body('avatar').optional().isURL().withMessage('Avatar must be a valid URL'),
  body('bio').optional().isLength({ max: 1000 }).withMessage('Bio must be at most 1000 characters'),
  body('specialization').optional().trim().notEmpty().withMessage('Specialization cannot be empty'),
  body('consultationFee').optional().isFloat({ min: 0 }).withMessage('Consultation fee must be non-negative'),
  body('experienceYears').optional().isInt({ min: 0 }).withMessage('Experience must be non-negative'),
  body('gender')
    .optional()
    .isIn(['male', 'female', 'other', 'prefer_not_to_say'])
    .withMessage('Invalid gender'),
  body('dateOfBirth').optional().isISO8601().withMessage('Valid date of birth required'),
];

export const scheduleSlotValidation = [
  body('dayOfWeek').isInt({ min: 0, max: 6 }).withMessage('dayOfWeek must be 0-6'),
  body('startTime').matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('startTime must be HH:mm'),
  body('endTime').matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('endTime must be HH:mm'),
  body('slotMinutes').optional().isInt({ min: 5, max: 120 }).withMessage('slotMinutes must be 5-120'),
  body('maxAppointments').optional().isInt({ min: 1, max: 100 }).withMessage('maxAppointments must be 1-100'),
];

export const reserveSlotValidation = [
  body('doctorId').isMongoId().withMessage('Invalid doctor ID'),
  body('scheduledAt').isISO8601().withMessage('scheduledAt must be a valid ISO date'),
];

export const scheduleSlotIdValidation = [
  param('slotId').isMongoId().withMessage('Invalid schedule slot ID'),
];

export const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain uppercase, lowercase, and a number'),
];

export const deleteAccountValidation = [
  body('password').notEmpty().withMessage('Password is required'),
];

export default {
  patientRegisterValidation,
  doctorRegisterValidation,
  loginValidation,
  normalAppointmentValidation,
  urgentAppointmentValidation,
  appointmentIdValidation,
  paymentIdValidation,
  updateAppointmentStatusValidation,
  cancelAppointmentValidation,
  paginationValidation,
  updateProfileValidation,
  scheduleSlotValidation,
  scheduleSlotIdValidation,
  reserveSlotValidation,
  changePasswordValidation,
  deleteAccountValidation,
};
