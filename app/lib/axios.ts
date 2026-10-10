import axios from 'axios';
import Constants from 'expo-constants';

const backendUrl = Constants.expoConfig?.extra?.backendUrl;

if (typeof backendUrl !== 'string' || !backendUrl.trim()) {
  throw new Error('BACKEND_URL is not configured.');
}

export const api = axios.create({
  baseURL: backendUrl.replace(/\/+$/, ''),
  headers: {
    'Content-Type': 'application/json', 
  },
});

api.interceptors.request.use(async (config) => {
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'The request failed.';

    error.message = message;
    return Promise.reject(error);
  },
);

export default api;
