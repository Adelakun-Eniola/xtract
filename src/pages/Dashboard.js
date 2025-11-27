import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Spinner, Alert, Badge } from 'react-bootstrap';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { getUserData, getStats } from '../services/dashboardService';
import { 
  getDashboardData, 
  getDashboardStats, 
  saveDashboardData, 
  saveDashboardStats, 
  updateDashboardStats,
  getLastSync,
  debugLocalStorage,
  migrateDataToUser,
  addSampleData,
  refreshDashboardData,
  ensureDataExists 
} from '../services/localStorageService';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Dashboard = () => {
  const [data, setData] = useState([]);   
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastSync, setLastSync] = useState(null);

  // Load data from localStorage first, then sync with server
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Migrate any default data to user-specific keys
        migrateDataToUser();
        
        // Debug localStorage contents
        debugLocalStorage();
        
        // Ensure data exists and load from localStorage
        const localData = ensureDataExists();
        const localStats = getDashboardStats();
        const syncTime = getLastSync();
        
        console.log('Dashboard loading - Local data:', localData.length, 'items');
        console.log('Dashboard loading - Local stats:', localStats);
        
        // Always set the data (ensureDataExists guarantees we have data)
        setData(localData);
        setStats(localStats);
        setLastSync(syncTime || new Date());
        setLoading(false); // Show data immediately
        
        // Then sync with server in background (but don't overwrite local data if server is empty)
        try {
          console.log('Dashboard: Attempting server sync...');
          const [userData, statsData] = await Promise.all([
            getUserData(),
            getStats()
          ]);

          const serverData = Array.isArray(userData?.data) ? userData.data : (Array.isArray(userData) ? userData : []);
          const serverStats = statsData || null;
          
          console.log('Dashboard: Server data received:', serverData.length, 'items');
          console.log('Dashboard: Server stats received:', serverStats);
          
          // Only update if server has data OR if we don't have local data
          if (serverData.length > 0) {
            console.log('Dashboard: Updating with server data');
            setData(serverData);
            setStats(serverStats);
            saveDashboardData(serverData);
            if (serverStats) {
              saveDashboardStats(serverStats);
            }
            setLastSync(new Date());
          } else if (localData.length === 0) {
            console.log('Dashboard: No server data and no local data, keeping current state');
            // Don't overwrite local data with empty server data
          } else {
            console.log('Dashboard: Server has no data, keeping local data');
            setError('Using local data. Server has no data yet.');
          }
          
        } catch (serverError) {
          // If server fails but we have local data, just show warning
          console.warn('Dashboard: Server sync failed:', serverError);
          if (localData.length > 0 || data.length > 0) {
            setError('Using offline data. Server sync failed.');
          } else {
            setError('Failed to load dashboard data. Please try again later.');
            console.error('Dashboard data error:', serverError);
          }
        }
        
      } catch (err) {
        setError('Failed to load dashboard data.');
        console.error('Dashboard loading error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    
    // Listen for storage events (when data is updated from scraper)
    const handleStorageChange = (e) => {
      if (e.key && e.key.includes('dashboard_data')) {
        const updatedData = getDashboardData();
        const updatedStats = getDashboardStats();
        setData(updatedData);
        setStats(updatedStats);
        setLastSync(getLastSync());
        console.log('Dashboard updated from localStorage event');
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom events from the same tab
    const handleCustomUpdate = () => {
      const updatedData = getDashboardData();
      const updatedStats = getDashboardStats();
      setData(updatedData);
      setStats(updatedStats);
      setLastSync(getLastSync());
      console.log('Dashboard updated from custom event');
    };
    
    window.addEventListener('dashboardUpdate', handleCustomUpdate);
    
    // Periodic check to ensure data doesn't disappear
    const dataCheckInterval = setInterval(() => {
      const currentData = getDashboardData();
      if (currentData.length === 0 && data.length > 0) {
        console.warn('Dashboard: Data disappeared, restoring...');
        const restoredData = ensureDataExists();
        const restoredStats = getDashboardStats();
        setData(restoredData);
        setStats(restoredStats);
      }
    }, 5000); // Check every 5 seconds
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('dashboardUpdate', handleCustomUpdate);
      clearInterval(dataCheckInterval);
    };
  }, []);

  const chartData = {
    labels: ['Email', 'Phone', 'Address'],
    datasets: [
      {
        label: 'Success Rate (%)',
        data: stats
          ? [
              stats.email_success_rate || 0,
              stats.phone_success_rate || 0,
              stats.address_success_rate || 0,
            ]
          : [0, 0, 0],
        backgroundColor: [
          'rgba(54, 162, 235, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 206, 86, 0.6)',
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(255, 206, 86, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Data Extraction Success Rate' },
    },
    scales: {
      y: { beginAtZero: true, max: 100 },
    },
  };

  if (loading) {
    return (
      <div className="loading-spinner d-flex justify-content-center align-items-center" style={{ height: "100vh" }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <Container className="dashboard-container">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="mb-0">Dashboard</h1>
        <div className="d-flex align-items-center gap-2">
          {lastSync && (
            <Badge bg="secondary">
              Last updated: {lastSync.toLocaleTimeString()}
            </Badge>
          )}
          <button 
            className="btn btn-sm btn-outline-primary me-2"
            onClick={() => {
              debugLocalStorage();
              const currentData = getDashboardData();
              const currentStats = getDashboardStats();
              console.log('Manual debug - Data:', currentData.length, 'items');
              console.log('Manual debug - Stats:', currentStats);
            }}
          >
            Debug Storage
          </button>
          <button 
            className="btn btn-sm btn-outline-success"
            onClick={() => {
              const newData = refreshDashboardData();
              const newStats = getDashboardStats();
              setData(newData);
              setStats(newStats);
              setLastSync(new Date());
              console.log('Dashboard refreshed with sample data');
            }}
          >
            Add Sample Data
          </button>
          <small className="text-muted ms-2">
            Items: {data.length} | LocalStorage: {getDashboardData().length}
          </small>
        </div>
      </div>

      {error && <Alert variant={error.includes('offline') ? 'warning' : 'danger'}>{error}</Alert>}

      {stats && (
        <Row className="mb-4">
          <Col md={3}>
            <Card className="stats-card text-center">
              <Card.Body>
                <Card.Title>Total Entries</Card.Title>
                <Card.Text className="display-4">{stats.total_entries || 0}</Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="stats-card text-center">
              <Card.Body>
                <Card.Title>Emails Found</Card.Title>
                <Card.Text className="display-4">{stats.with_email || 0}</Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="stats-card text-center">
              <Card.Body>
                <Card.Title>Phones Found</Card.Title>
                <Card.Text className="display-4">{stats.with_phone || 0}</Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="stats-card text-center">
              <Card.Body>
                <Card.Title>Addresses Found</Card.Title>
                <Card.Text className="display-4">{stats.with_address || 0}</Card.Text>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {stats && stats.total_entries > 0 && (
        <Row className="mb-4">
          <Col>
            <Card>
              <Card.Body>
                <Bar data={chartData} options={chartOptions} />
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Recent Extractions</h5>
            </Card.Header>
            <Card.Body>
              {(!data || data.length === 0) ? (
                <p className="text-center">
                  No data extracted yet. Go to the Extract Data page to get started.
                </p>
              ) : (
                <Table responsive striped hover className="data-table">
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Address</th>
                      <th>Website</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td>{item.company_name || 'Unknown'}</td>
                        <td>
                          {item.email && item.email !== 'N/A' && item.email !== 'Not found' ? (
                            <a href={`mailto:${item.email}`} className="text-decoration-none">
                              {item.email}
                            </a>
                          ) : (
                            <span className="text-muted">Not found</span>
                          )}
                        </td>
                        <td>
                          {item.phone && item.phone !== 'N/A' && item.phone !== 'Not found' ? (
                            <a href={`tel:${item.phone}`} className="text-decoration-none">
                              {item.phone}
                            </a>
                          ) : (
                            <span className="text-muted">Not found</span>
                          )}
                        </td>
                        <td>
                          {item.address && item.address !== 'N/A' && item.address !== 'Not found' ? (
                            <span>{item.address}</span>
                          ) : (
                            <span className="text-muted">Not found</span>
                          )}
                        </td>
                        <td>
                          {item.website_url && item.website_url !== 'N/A' && item.website_url !== 'Not found' ? (
                            <a href={item.website_url} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
                              {item.website_url.length > 30 ? item.website_url.substring(0, 30) + '...' : item.website_url}
                            </a>
                          ) : (
                            <span className="text-muted">Not found</span>
                          )}
                        </td>
                        <td>
                          {item.created_at
                            ? new Date(item.created_at).toLocaleDateString()
                            : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Dashboard;
