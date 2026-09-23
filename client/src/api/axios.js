import axios from 'axios';
import { store } from '../redux/store';
import { setCredentials, clearCredentials } from '../redux/slices/authSlice';

// Create dedicated axios instance with credentials enabled so httpOnly cookies flow automatically
const api = axios.create({
  baseURL: '/api',
  withCredentials: true
});

// Attach current 15-minute access token to outgoing request headers
api.interceptors.request.use(
  (config) => {
    const state = store.getState();
    const token = state.auth?.accessToken;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept 401 responses, silently rotate tokens via /refresh, and retry failed request once
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Retry only once per request and avoid infinite loops when refresh endpoint itself returns 401
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/refresh') &&
      !originalRequest.url.includes('/auth/login')
    ) {
      originalRequest._retry = true;

      try {
        // Request refreshed access token using the httpOnly cookie
        const refreshResponse = await axios.post(
          '/api/auth/refresh',
          {},
          { withCredentials: true }
        );

        const { accessToken, user } = refreshResponse.data;

        // Update Redux state with new access token
        store.dispatch(setCredentials({ accessToken, user }));

        // Update header and retry original request
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, session is completely dead - purge credentials and redirect to login
        store.dispatch(clearCredentials());
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
