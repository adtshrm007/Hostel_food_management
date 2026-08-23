import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor: on 401, redirect to login if attempting to access protected pages
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // If the server is unreachable (Network Error) or returns a 5xx status code (crash), redirect to Vercel
    if (!error.response || (error.response.status >= 500 && error.response.status < 600)) {
      window.location.href = 'https://gita-bhojanalaya.vercel.app/';
      return Promise.reject(error);
    }

    if (error.response && error.response.status === 401) {
      const path = window.location.pathname;
      const publicPaths = ['/', '/login', '/register', '/forgot-password', '/enter-key'];
      const isPublic = publicPaths.some((p) => path === p || (p !== '/' && path.startsWith(p)));
      if (!isPublic) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
