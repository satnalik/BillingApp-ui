import axios from 'axios';

const baseURL =
  (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api').replace(
    /\/$/,
    '',
  );

const api = axios.create({ baseURL });

// Interceptor to inject Token into every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    // 2. Grab the Tenant ID (Crucial for your Backend Interceptor!)
    const tenantId = localStorage.getItem("tenantId");
    if (tenantId) {
      config.headers["X-Tenant-ID"] = tenantId; 
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

api.interceptors.response.use(
  (response) => response, // If the request is successful, do nothing
  (error) => {
    // Check if the error is 401 (Unauthorized) or a JWT specific error
    if (error.response && (error.response.status === 401)) {
      console.warn("Token expired or invalid. Redirecting to login...");
      
      // 1. Clear the local storage so we don't keep sending the bad token
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // 2. Redirect to login page
      window.location.href = '/login'; 
    }
    return Promise.reject(error);
  }
);

export default api;
