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

// Extract data with streaming (for Google Maps)
export const extractDataStream = async (url, onProgress) => {
  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }
  
  const token = localStorage.getItem('token');
  const apiUrl = (process.env.REACT_APP_API_URL || 'http://localhost:5000') + '/api/scraper/extract';
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({ url, stream: true })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    let results = [];
    let errors = [];
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          
          if (data.type === 'result') {
            results.push(data.data);
            if (onProgress) {
              onProgress({
                type: 'result',
                data: data.data,
                progress: data.progress
              });
            }
          } else if (data.type === 'error') {
            errors.push(data);
            if (onProgress) {
              onProgress({
                type: 'error',
                error: data
              });
            }
          } else if (data.type === 'status') {
            if (onProgress) {
              onProgress({
                type: 'status',
                message: data.message,
                total: data.total
              });
            }
          } else if (data.type === 'complete') {
            if (onProgress) {
              onProgress({
                type: 'complete',
                results,
                errors
              });
            }
          }
        }
      }
    }
    
    return { results, errors };
    
  } catch (error) {
    console.error("Streaming extraction error:", error);
    throw error;
  }
};

// Search for businesses in Google Maps (returns list without scraping details)
export const searchBusinesses = async (url, includePhone = false) => {
  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }
  try {
    const response = await axios.post(`${API_URL}/search-businesses`, { url, include_phone: includePhone }, authHeader());
    return response.data;
  } catch (error) {
    console.error('Business search error:', error);
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
