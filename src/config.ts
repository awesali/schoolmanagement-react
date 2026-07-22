const isDevelopment = process.env.NODE_ENV === 'development';
const isLocalFrontend = ['localhost', '127.0.0.1'].includes(window.location.hostname);

export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL
  || (isDevelopment || isLocalFrontend
    ? 'https://localhost:44380'
    : 'https://school.cognerasystems.com');

