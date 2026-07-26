/**
 * Browser requests use `/api` (proxied by Vite to the backend).
 * Server-side code uses the full backend URL.
 */
const backendOrigin =
  import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export const API_BASE_URL =
  typeof window === 'undefined'
    ? `${backendOrigin}/api`
    : import.meta.env.VITE_API_URL || '/api';

export const SOCKET_URL =
  typeof window === 'undefined'
    ? import.meta.env.VITE_SOCKET_URL || backendOrigin
    : import.meta.env.VITE_SOCKET_URL || window.location.origin;

export const apiUrl = (path: string) =>
  `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
