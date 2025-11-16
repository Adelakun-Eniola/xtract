import axios from 'axios';

const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000') + '/api/scraper';

// Debug: Log the API URL being used
console.log('ScraperService API_URL:', API_URL);
console.log('Environment:', process.env.NODE_ENV);
console.log('REACT_APP_API_URL:', process.env.REACT_APP_API_URL);

// Helper function to get auth headers
const authHeader = () => {
  const token = localStorage.getItem('token');
  if (token) {
    return { headers: { Authorization: 'Bearer ' + token } };
  }
  return {};
};

// Extract data from a single website or Google Maps search URL
export const extractData = async (url) => {
  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;  // auto-fix missing scheme
  }
  try {
    const response = await axios.post(`${API_URL}/extract`, { url }, authHeader());
    return response.data;
  } catch (error) {
    console.error("Data extraction error:", error);
    throw error;
  }
};

// Extract data from multiple websites
export const batchExtract = async (urls) => {
  try {
    const response = await axios.post(`${API_URL}/batch`, { urls }, authHeader());
    return response.data;
  } catch (error) {
    console.error('Batch extraction error:', error);
    throw error;
  }
};
