/**
 * API base URL for fetch calls.
 * When VITE_API_URL is set (e.g. for Vercel frontend + Railway backend), use it.
 * Otherwise empty string = same-origin (monolith deployment).
 */
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export const api = (path: string, options?: RequestInit): Promise<Response> => {
  const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : '/' + path}`;
  return fetch(url, options);
};
