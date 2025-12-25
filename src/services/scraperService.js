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

// ============================================
// NEW CHUNKED SCRAPING API (Recommended)
// ============================================

/**
 * Initialize a scraping job - finds all businesses and returns a job_id
 * @param {string} url - Google Maps search URL
 * @returns {Promise<{job_id: string, total_items: number}>}
 */
export const initScrapeJob = async (url) => {
  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }
  try {
    const response = await axios.post(`${API_URL}/init`, { url }, authHeader());
    return response.data;
  } catch (error) {
    console.error("Init job error:", error);
    throw error;
  }
};

/**
 * Process a batch of businesses for a job with retry logic
 * @param {string} jobId - The job ID from initScrapeJob
 * @param {number} limit - Number of businesses to process (default: 1 for memory optimization)
 * @param {boolean} skipEmail - Skip email extraction (faster, less memory)
 * @param {number} retryCount - Internal retry counter
 * @returns {Promise<{results: Array, processed: number, total: number, completed: boolean}>}
 */
export const processBatch = async (jobId, limit = 1, skipEmail = false, retryCount = 0) => {
  const MAX_RETRIES = 3;
  const RETRY_DELAYS = [2000, 5000, 10000]; // Exponential backoff: 2s, 5s, 10s
  
  try {
    const response = await axios.post(`${API_URL}/batch`, { 
      job_id: jobId, 
      limit,
      skip_email: skipEmail
    }, authHeader());
    return response.data;
  } catch (error) {
    const status = error.response?.status;
    const isRetryable = status === 502 || status === 503 || status === 504 || error.code === 'ERR_NETWORK';
    
    console.error(`Batch processing error (attempt ${retryCount + 1}/${MAX_RETRIES + 1}):`, error.message);
    
    // Retry on server errors (502, 503, 504) or network errors
    if (isRetryable && retryCount < MAX_RETRIES) {
      const delay = RETRY_DELAYS[retryCount] || 10000;
      console.log(`Retrying in ${delay/1000}s... (server may be recovering)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return processBatch(jobId, limit, skipEmail, retryCount + 1);
    }
    
    throw error;
  }
};

/**
 * Run chunked scraping with progress callback
 * This is the main function to use for scraping - handles the full flow
 * Includes retry logic for server crashes (502 errors)
 * @param {string} url - Google Maps search URL
 * @param {function} onProgress - Callback for progress updates
 * @returns {Promise<{results: Array, total: number, job_id: string}>}
 */
export const runChunkedScraping = async (url, onProgress) => {
  try {
    // Step 1: Initialize the job
    if (onProgress) {
      onProgress({ type: 'status', message: 'Initializing search...' });
    }
    
    const initResult = await initScrapeJob(url);
    const { job_id, total_items } = initResult;
    
    if (onProgress) {
      onProgress({ 
        type: 'status', 
        message: `Found ${total_items} businesses. Starting extraction...`,
        total: total_items,
        job_id: job_id
      });
    }
    
    // Step 2: Process batches until complete (1 at a time for memory optimization)
    let allResults = [];
    let completed = false;
    let processed = 0;
    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = 5;
    
    while (!completed && consecutiveErrors < MAX_CONSECUTIVE_ERRORS) {
      try {
        const batchResult = await processBatch(job_id, 1, false);  // 1 business at a time, extract email
        consecutiveErrors = 0; // Reset on success
        
        // Add results
        if (batchResult.results && batchResult.results.length > 0) {
          allResults = [...allResults, ...batchResult.results];
          
          // Send each business to progress callback
          for (const business of batchResult.results) {
            if (onProgress) {
              onProgress({
                type: 'business',
                data: {
                  name: business.company_name,
                  phone: business.phone || 'N/A',
                  address: business.address || 'N/A',
                  website: business.website_url || 'N/A',
                  email: business.email || 'N/A'
                },
                progress: {
                  current: batchResult.processed,
                  total: batchResult.total
                },
                job_id: job_id
              });
            }
          }
        }
        
        processed = batchResult.processed;
        completed = batchResult.completed;
        
        if (onProgress) {
          onProgress({
            type: 'progress',
            message: `Processed ${processed} of ${total_items} businesses...`,
            current: processed,
            total: total_items,
            job_id: job_id
          });
        }
        
        // Small delay between batches to let server recover
        if (!completed) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (batchError) {
        consecutiveErrors++;
        console.error(`Batch error (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`, batchError.message);
        
        if (onProgress) {
          onProgress({
            type: 'status',
            message: `Server recovering... Retrying (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS})`,
            current: processed,
            total: total_items,
            job_id: job_id
          });
        }
        
        // Wait longer before retrying after an error
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    // Step 3: Complete (or stopped due to errors)
    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      if (onProgress) {
        onProgress({
          type: 'complete',
          message: `Partially completed. Extracted ${allResults.length} of ${total_items} businesses (server issues).`,
          total: allResults.length,
          job_id: job_id
        });
      }
    } else if (onProgress) {
      onProgress({
        type: 'complete',
        message: `Completed! Extracted ${allResults.length} businesses`,
        total: allResults.length,
        job_id: job_id
      });
    }
    
    return { results: allResults, total: allResults.length, job_id: job_id };
    
  } catch (error) {
    if (onProgress) {
      onProgress({
        type: 'error',
        error: error.response?.data?.error || error.message || 'Failed to scrape businesses'
      });
    }
    throw error;
  }
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
    const response = await axios.post(`${API_URL}/search-businesses`, { 
      url, 
      include_phone: includePhone,
      stream: false
    }, authHeader());
    return response.data;
  } catch (error) {
    console.error('Business search error:', error);
    throw error;
  }
};

// Search for businesses with streaming (for phone extraction)
export const searchBusinessesStream = async (url, onProgress) => {
  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }
  
  const token = localStorage.getItem('token');
  const apiUrl = `${API_URL}/search-businesses`;
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({ url, include_phone: true, stream: true })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            console.log('SSE event received:', data.type, data);
            if (onProgress) {
              onProgress(data);
            }
          } catch (parseError) {
            console.error('Error parsing SSE data:', line, parseError);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('Streaming search error:', error);
    throw error;
  }
};

// Search for businesses with addresses (streaming)
export const searchAddressesStream = async (url, onProgress) => {
  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }
  
  const token = localStorage.getItem('token');
  const apiUrl = `${API_URL}/search-addresses`;
  
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
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            console.log('Address SSE event received:', data.type, data);
            if (onProgress) {
              onProgress(data);
            }
          } catch (parseError) {
            console.error('Error parsing address SSE data:', line, parseError);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('Streaming address search error:', error);
    throw error;
  }
};

// Extract data from multiple websites (legacy endpoint)
export const batchExtract = async (urls) => {
  try {
    const response = await axios.post(`${API_URL}/batch-urls`, { urls }, authHeader());
    return response.data;
  } catch (error) {
    console.error('Batch extraction error:', error);
    throw error;
  }
};

// ============================================
// CSV EXPORT FUNCTION
// ============================================

/**
 * Export job results to CSV file
 * Downloads a CSV file with UTF-8 BOM encoding for Excel compatibility
 * @param {string} jobId - The job ID to export
 * @returns {Promise<void>}
 */
export const exportJobToCSV = async (jobId) => {
  const token = localStorage.getItem('token');
  const apiUrl = `${API_URL}/export/${jobId}`;
  
  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    // Get the blob from response
    const blob = await response.blob();
    
    // Create a temporary URL for the blob
    const url = window.URL.createObjectURL(blob);
    
    // Create a temporary anchor element
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `leads-${jobId}.csv`;
    
    // Append to body, click, and remove
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    return true;
  } catch (error) {
    console.error('CSV export error:', error);
    throw error;
  }
};
  // "url": "https://www.google.com/maps/search/pizza+near+manhattan"