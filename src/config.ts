// Live API URL
export const LIVE_API_BASE_URL = 'https://cognerasystems.com';

// Local API URL  
export const LOCAL_API_BASE_URL = 'https://localhost:7015';

// Automatic selection based on environment
export const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? LIVE_API_BASE_URL 
  : LOCAL_API_BASE_URL;
