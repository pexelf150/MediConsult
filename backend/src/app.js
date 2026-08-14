import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import env from './config/env.js';
import routes from './routes/index.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app = express();

app.set('trust proxy', 1);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      
      // Check if origin is in the allowed list
      if (env.clientOrigins?.length && env.clientOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Allow localhost for development
      if (env.isDevLocalOrigin(origin)) {
        return callback(null, true);
      }
      
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(helmet());
app.use(compression());

if (env.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Disable caching for API responses
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.use('/api', apiLimiter);
app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
