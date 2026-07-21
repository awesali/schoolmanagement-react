const isDevelopment = process.env.NODE_ENV === 'development';
const isLocalFrontend = ['localhost', '127.0.0.1'].includes(window.location.hostname);

export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL
  || (isDevelopment || isLocalFrontend
    ? 'https://localhost:44380'
    : 'https://school.cognerasystems.com');

export const PARENT_API_BASE_URL = process.env.REACT_APP_PARENT_API_BASE_URL
  || API_BASE_URL;

export const TRANSPORT_API_BASE_URL = process.env.REACT_APP_TRANSPORT_API_BASE_URL
  || API_BASE_URL;

export const INVENTORY_API_BASE_URL = process.env.REACT_APP_INVENTORY_API_BASE_URL
  || API_BASE_URL;

// Kept separate while the permission API is being developed locally and has
// not yet been deployed to the production IIS application.
export const PERMISSION_API_BASE_URL = process.env.REACT_APP_PERMISSION_API_BASE_URL
  || 'https://localhost:44380';
