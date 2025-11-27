import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL + '/api/auth';

// Handle Google authentication
export const googleLogin = async (tokenId) => {
  try {
    console.log('AuthService: Making API call to:', `${API_URL}/google`);
    console.log('AuthService: Sending token (first 50 chars):', tokenId.substring(0, 50) + '...');
    
    const response = await axios.post(`${API_URL}/google`, { token: tokenId });
    
    console.log('AuthService: Backend response status:', response.status);
    console.log('AuthService: Backend response data:', response.data);
    
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      console.log('AuthService: Token and user data saved to localStorage');
      return response.data.user;
    } else {
      console.error('AuthService: No access_token in response');
      throw new Error('No access token received from server');
    }
  } catch (error) {
    console.error('AuthService: Google login error:', error);
    console.error('AuthService: Error response:', error.response?.data);
    console.error('AuthService: Error status:', error.response?.status);
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