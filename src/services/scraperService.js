import axios from 'axios';

const API_URL = "https://xtracter.onrender.com/api/scraper";

// Extract data from a single website
export const extractData = async (url) => {
  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;  // auto-fix missing scheme
  }
  try {
    const response = await axios.post(`${API_URL}/extract`, { url });
    return response.data;
  } catch (error) {
    console.error("Data extraction error:", error);
    throw error;
  }
};


// Extract data from multiple websites
export const batchExtract = async (urls) => {
  try {
    const response = await axios.post(`${API_URL}/batch`, { urls });
    return response.data;
  } catch (error) {
    console.error('Batch extraction error:', error);
    throw error;
  }
};