import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8081/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — inject JWT token on every request automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('fisioplus_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 Unauthorized (expired token / forced logout)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('fisioplus_token');
      localStorage.removeItem('fisioplus_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
