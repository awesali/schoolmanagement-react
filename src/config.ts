export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://cognerasystems.com';

export const API_ENDPOINTS = {
  LOGIN: `${API_BASE_URL}/api/auth/login`,
  CREATE_SCHOOL: `${API_BASE_URL}/api/Admin/create`,
};
