// Local Storage Service for Dashboard Data
const STORAGE_KEYS = {
  DASHBOARD_DATA: 'dashboard_data',
  DASHBOARD_STATS: 'dashboard_stats',
  LAST_SYNC: 'last_sync'
};

// Get user ID from token for user-specific storage
const getUserId = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    console.log('No token found for user ID extraction');
    return null;
  }
  
  try {
    // Decode JWT token to get user ID (simple base64 decode)
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId = payload.sub || payload.user_id || payload.identity;
    console.log('Extracted user ID:', userId);
    return userId;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

// Create user-specific storage key
const getUserStorageKey = (key) => {
  const userId = getUserId();
  // Fallback to a generic key if no user ID (to prevent data loss)
  return userId ? `${key}_${userId}` : `${key}_default`;
};

// Save dashboard data to local storage
export const saveDashboardData = (data) => {
  try {
    const storageKey = getUserStorageKey(STORAGE_KEYS.DASHBOARD_DATA);
    localStorage.setItem(storageKey, JSON.stringify(data));
    localStorage.setItem(getUserStorageKey(STORAGE_KEYS.LAST_SYNC), new Date().toISOString());
    console.log('Dashboard data saved to localStorage:', storageKey, data.length, 'items');
  } catch (error) {
    console.error('Error saving dashboard data:', error);
  }
};

// Get dashboard data from local storage
export const getDashboardData = () => {
  try {
    const storageKey = getUserStorageKey(STORAGE_KEYS.DASHBOARD_DATA);
    console.log('Getting dashboard data with key:', storageKey);
    const data = localStorage.getItem(storageKey);
    const parsedData = data ? JSON.parse(data) : [];
    console.log('Retrieved dashboard data:', parsedData.length, 'items');
    return parsedData;
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    return [];
  }
};

// Save dashboard stats to local storage
export const saveDashboardStats = (stats) => {
  try {
    const storageKey = getUserStorageKey(STORAGE_KEYS.DASHBOARD_STATS);
    localStorage.setItem(storageKey, JSON.stringify(stats));
    console.log('Dashboard stats saved to localStorage');
  } catch (error) {
    console.error('Error saving dashboard stats:', error);
  }
};

// Get dashboard stats from local storage
export const getDashboardStats = () => {
  try {
    const storageKey = getUserStorageKey(STORAGE_KEYS.DASHBOARD_STATS);
    const stats = localStorage.getItem(storageKey);
    return stats ? JSON.parse(stats) : null;
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    return null;
  }
};

// Add new extracted data to local storage
export const addExtractedData = (newData) => {
  try {
    const existingData = getDashboardData();
    const updatedData = Array.isArray(newData) ? [...existingData, ...newData] : [...existingData, newData];
    
    // Sort by created_at (newest first)
    updatedData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    saveDashboardData(updatedData);
    
    // Update stats
    updateDashboardStats(updatedData);
    
    console.log('New extracted data added to localStorage');
    return updatedData;
  } catch (error) {
    console.error('Error adding extracted data:', error);
    return getDashboardData();
  }
};

// Update dashboard stats based on current data
export const updateDashboardStats = (data = null) => {
  try {
    const currentData = data || getDashboardData();
    
    const stats = {
      total_entries: currentData.length,
      with_email: currentData.filter(item => item.email && item.email !== 'N/A' && item.email !== 'Not found').length,
      with_phone: currentData.filter(item => item.phone && item.phone !== 'N/A' && item.phone !== 'Not found').length,
      with_address: currentData.filter(item => item.address && item.address !== 'N/A' && item.address !== 'Not found').length,
      with_website: currentData.filter(item => item.website_url && item.website_url !== 'N/A' && item.website_url !== 'Not found').length,
      email_success_rate: currentData.length > 0 ? Math.round((currentData.filter(item => item.email && item.email !== 'N/A' && item.email !== 'Not found').length / currentData.length) * 100) : 0,
      phone_success_rate: currentData.length > 0 ? Math.round((currentData.filter(item => item.phone && item.phone !== 'N/A' && item.phone !== 'Not found').length / currentData.length) * 100) : 0,
      address_success_rate: currentData.length > 0 ? Math.round((currentData.filter(item => item.address && item.address !== 'N/A' && item.address !== 'Not found').length / currentData.length) * 100) : 0,
      last_updated: new Date().toISOString()
    };
    
    saveDashboardStats(stats);
    console.log('Dashboard stats updated:', stats);
    return stats;
  } catch (error) {
    console.error('Error updating dashboard stats:', error);
    return getDashboardStats();
  }
};

// Clear all dashboard data (for logout)
export const clearDashboardData = () => {
  try {
    const userId = getUserId();
    if (userId) {
      localStorage.removeItem(getUserStorageKey(STORAGE_KEYS.DASHBOARD_DATA));
      localStorage.removeItem(getUserStorageKey(STORAGE_KEYS.DASHBOARD_STATS));
      localStorage.removeItem(getUserStorageKey(STORAGE_KEYS.LAST_SYNC));
      console.log('Dashboard data cleared from localStorage');
    }
  } catch (error) {
    console.error('Error clearing dashboard data:', error);
  }
};

// Get last sync time
export const getLastSync = () => {
  try {
    const storageKey = getUserStorageKey(STORAGE_KEYS.LAST_SYNC);
    const lastSync = localStorage.getItem(storageKey);
    return lastSync ? new Date(lastSync) : null;
  } catch (error) {
    console.error('Error getting last sync time:', error);
    return null;
  }
};

// Migrate data from default keys to user-specific keys (for when user logs in)
export const migrateDataToUser = () => {
  try {
    const userId = getUserId();
    if (!userId) return;
    
    // Check if we have data in default keys that should be migrated
    const defaultDataKey = `${STORAGE_KEYS.DASHBOARD_DATA}_default`;
    const defaultStatsKey = `${STORAGE_KEYS.DASHBOARD_STATS}_default`;
    
    const defaultData = localStorage.getItem(defaultDataKey);
    const defaultStats = localStorage.getItem(defaultStatsKey);
    
    if (defaultData || defaultStats) {
      console.log('Migrating data from default to user-specific keys');
      
      if (defaultData) {
        const userDataKey = getUserStorageKey(STORAGE_KEYS.DASHBOARD_DATA);
        localStorage.setItem(userDataKey, defaultData);
        localStorage.removeItem(defaultDataKey);
      }
      
      if (defaultStats) {
        const userStatsKey = getUserStorageKey(STORAGE_KEYS.DASHBOARD_STATS);
        localStorage.setItem(userStatsKey, defaultStats);
        localStorage.removeItem(defaultStatsKey);
      }
      
      console.log('Data migration completed');
    }
  } catch (error) {
    console.error('Error migrating data:', error);
  }
};

// Debug function to check localStorage contents
export const debugLocalStorage = () => {
  console.log('=== LocalStorage Debug ===');
  const userId = getUserId();
  console.log('Current user ID:', userId);
  
  if (userId) {
    const dataKey = getUserStorageKey(STORAGE_KEYS.DASHBOARD_DATA);
    const statsKey = getUserStorageKey(STORAGE_KEYS.DASHBOARD_STATS);
    const syncKey = getUserStorageKey(STORAGE_KEYS.LAST_SYNC);
    
    console.log('Data key:', dataKey);
    console.log('Stats key:', statsKey);
    console.log('Sync key:', syncKey);
    
    const data = localStorage.getItem(dataKey);
    const stats = localStorage.getItem(statsKey);
    const sync = localStorage.getItem(syncKey);
    
    console.log('Data exists:', !!data, data ? JSON.parse(data).length + ' items' : 'none');
    console.log('Stats exists:', !!stats, stats ? JSON.parse(stats) : 'none');
    console.log('Sync exists:', !!sync, sync || 'none');
  } else {
    console.log('No user ID - cannot check user-specific storage');
  }
  
  // Show all localStorage keys
  console.log('All localStorage keys:', Object.keys(localStorage));
  console.log('=== End Debug ===');
};