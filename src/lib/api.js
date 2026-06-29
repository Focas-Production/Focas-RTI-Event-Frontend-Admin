const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:7000';

// Ngrok free tier blocks browser requests unless this header is present.
// The backend already lists it in allowedHeaders so CORS passes through.
const BASE_HEADERS = {
  'Content-Type':                'application/json',
  'ngrok-skip-browser-warning': 'true',
};

export const api = {
  get: (path) =>
    fetch(`${BACKEND}${path}`, { headers: BASE_HEADERS }),

  post: (path, body) =>
    fetch(`${BACKEND}${path}`, {
      method:  'POST',
      headers: BASE_HEADERS,
      body:    JSON.stringify(body),
    }),

  patch: (path, body) =>
    fetch(`${BACKEND}${path}`, {
      method:  'PATCH',
      headers: BASE_HEADERS,
      body:    JSON.stringify(body),
    }),
};

export { BACKEND };
