import http from 'http';
import { Server } from 'socket.io';
import app from './src/app.js';
import connectDB from './src/config/db.js';
import env from './src/config/env.js';
import { initializeSocket } from './src/config/socket.js';
import reservationService from './src/services/reservationService.js';

const startServer = async () => {
  await connectDB();

  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: env.clientOrigins?.length ? env.clientOrigins : env.clientUrl,
      credentials: true,
    },
  });

  initializeSocket(io);
  app.set('io', io);

  // Periodically clean up expired slot reservations every minute
  setInterval(async () => {
    try {
      const stats = await reservationService.cleanupExpiredReservations();
      if (stats.deletedCount > 0) {
        console.log(`[Reservation Cleanup] Cleaned up ${stats.deletedCount} expired reservations.`);
      }
    } catch (err) {
      console.error('[Reservation Cleanup Error] Failed to cleanup expired reservations:', err);
    }
  }, 60000);

  server.listen(env.port, () => {
    console.log(`MediConsult API running in ${env.nodeEnv} mode on port ${env.port}`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
