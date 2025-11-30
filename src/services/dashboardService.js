import axios from 'axios';

const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000') + '/api/dashboard';

// Helper function to get auth headers
const authHeader = () => {
  const token = localStorage.getItem('token');
  console.log('Token from localStorage in dashboardService:', token ? token.substring(0, 50) + '...' : 'No token');
  if (token) {
    return { headers: { Authorization: 'Bearer ' + token } };
  } else {
    return {};
  }
};

// Get all scraped data for the current user
export const getUserData = async () => {
  try {
    const response = await axios.get(`${API_URL}/data`, authHeader());
    return response.data;
  } catch (error) {
    console.error('Error fetching user data:', error.response?.data || error.message);
    throw error;
  }
};

// Get details for a specific scraped data entry
export const getDataDetail = async (dataId) => {
  try {
    const response = await axios.get(`${API_URL}/data/${dataId}`, authHeader());
    return response.data;
  } catch (error) {
    console.error('Error fetching data detail:', error.response?.data || error.message);
    throw error;
  }
};

// Get statistics about user's scraped data
export const getStats = async () => {
  try {
    const response = await axios.get(`${API_URL}/stats`, authHeader());
    return response.data;
  } catch (error) {
    console.error('Error fetching stats:', error.response?.data || error.message);
    throw error;
  }
};