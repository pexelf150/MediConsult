import { createMiddleware } from '@tanstack/react-start';

// Auth cookies are sent automatically on same-origin /api requests via the Vite proxy.
export const attachSupabaseAuth = createMiddleware({ type: 'function' }).client(
  async ({ next }) => next(),
);
