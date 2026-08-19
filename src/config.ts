const isDevelopment = process.env.NODE_ENV === 'development';
const isLocalFrontend = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const configuredApi = process.env.REACT_APP_API_BASE_URL?.trim();
const configuredApiIsLocal = configuredApi
  ? ['localhost', '127.0.0.1'].includes(new URL(configuredApi).hostname)
  : false;

export const API_BASE_URL = (configuredApi && (isLocalFrontend || !configuredApiIsLocal))
  ? configuredApi
  : (isDevelopment || isLocalFrontend
    ? 'https://localhost:7015'
    : 'https://school.cognerasystems.com');

