import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://vuna-main.onrender.com/api/';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  // ⚠️  Do NOT set a global Content-Type here.
  // For JSON requests DRF defaults to JSON automatically.
  // For FormData requests the browser must set multipart/form-data with the
  // correct boundary — setting it manually here would break file uploads.
});

// Automatically inject Token auth header on every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    // When the body is FormData, delete any Content-Type that Axios may have
    // inherited so the browser can set multipart/form-data + boundary itself.
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;