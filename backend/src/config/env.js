import dotenv from 'dotenv';

dotenv.config();

const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];

requiredEnvVars.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

const parseOrigins = () => {
  const fromEnv = process.env.CLIENT_URL || 'http://localhost:8080';
  return fromEnv.split(',').map((origin) => origin.trim()).filter(Boolean);
};

const isDevLocalOrigin = (origin) =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5001,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:8080',
  clientOrigins: parseOrigins(),
  isDevLocalOrigin,
  mongodbUri: process.env.MONGODB_URI,
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    cookieExpiresIn: parseInt(process.env.JWT_COOKIE_EXPIRES_IN, 10) || 7,
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    urgentPrice: parseInt(process.env.STRIPE_URGENT_CONSULTATION_PRICE, 10) || 4999,
  },
  jitsi: {
    domain: process.env.JITSI_DOMAIN || 'meet.jit.si',
    appId: process.env.JITSI_APP_ID || '',
    appSecret: process.env.JITSI_APP_SECRET || '',
    useJwt: process.env.JITSI_USE_JWT === 'true',
  },
  consultation: {
    urgentFee: parseInt(process.env.URGENT_CONSULTATION_FEE, 10) || 5000, // Fallback only if no doctors available
    currency: 'lkr', // Force LKR for Sri Lanka
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || '',
    logoUrl: process.env.SMTP_LOGO_URL || '',
  },
  backendUrl: process.env.BACKEND_URL || 'http://localhost:5001',
  frontendUrl: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').find(url => url.includes('8080'))?.trim() || process.env.CLIENT_URL.split(',')[0].trim() : 'http://localhost:8080',
};

export default env;
