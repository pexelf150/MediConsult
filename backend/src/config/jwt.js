import jwt from 'jsonwebtoken';
import env from './env.js';

export const signToken = (payload) =>
  jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  });

export const verifyToken = (token) => jwt.verify(token, env.jwt.secret);

export const getCookieOptions = () => ({
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
  maxAge: env.jwt.cookieExpiresIn * 24 * 60 * 60 * 1000,
});

export default { signToken, verifyToken, getCookieOptions };
