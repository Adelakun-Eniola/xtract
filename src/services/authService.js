import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL + '/api/auth';

// Handle Google authentication
export const googleLogin = async (tokenId) => {
  try {
    const response = await axios.post(`${API_URL}/google`, { token: tokenId });
    
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      return response.data.user;
    }
    
    return null;
  } catch (error) {
    console.error('Google login error:', error);
    throw error;
  }
};

// Check if user is authenticated
export const checkAuth = async () => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  if (token && user) {
    return JSON.parse(user);
  }
  
  return null;
};

// Logout user
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

// Set up axios interceptor for JWT
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);