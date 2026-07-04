export const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://school.cognerasystems.com'
  : (process.env.REACT_APP_API_BASE_URL || 'https://localhost:7015');
