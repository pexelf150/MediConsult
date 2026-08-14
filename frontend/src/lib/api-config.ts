/**
 * Browser requests use `/api` (proxied by Vite to the backend).
 * Server-side code uses the full backend URL.
 */
const backendOrigin =
  import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

// In production, use relative path to work with same-origin backend
// In development, use Vite proxy or explicit API URL
const getBrowserApiUrl = () => {
  const envApiUrl = import.meta.env.VITE_API_URL;
  // If env var is set to localhost, use relative path instead for production
  if (envApiUrl && envApiUrl.includes('localhost')) {
    return '/api';
  }
  return envApiUrl || '/api';
};

export const API_BASE_URL =
  typeof window === 'undefined'
    ? `${backendOrigin}/api`
    : getBrowserApiUrl();

export const SOCKET_URL =
  typeof window === 'undefined'
    ? import.meta.env.VITE_SOCKET_URL || backendOrigin
    : import.meta.env.VITE_SOCKET_URL || window.location.origin;

export const apiUrl = (path: string) =>
  `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
