import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Spinner, Alert, Badge, Toast, ToastContainer, ProgressBar } from 'react-bootstrap';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { getUserData, getStats } from '../services/dashboardService';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Dashboard = () => {
  const [data, setData] = useState([]);   
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastSync, setLastSync] = useState(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncMessage, setSyncMessage] = useState('');

  // Load data from MongoDB database
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Check if user is authenticated
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Please log in to view your dashboard');
          setLoading(false);
          return;
        }
        
        console.log('Dashboard: Loading data from MongoDB database...');
        
        // Load data from database
        const [userData, statsData] = await Promise.all([
          getUserData(),
          getStats()
        ]);
        
        console.log('Dashboard: Loaded from database:', userData.data?.length || 0, 'items');
        console.log('Dashboard: Stats from database:', statsData);
        
        setData(userData.data || []);
        setStats(statsData);
        setLastSync(new Date());
        
      } catch (err) {
        console.error('Dashboard loading error:', err);
        if (err.response?.status === 401) {
          setError('Please log in to view your dashboard');
        } else {
          setError('Failed to load dashboard data. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
    
    // Listen for custom events when scraper completes
    const handleScraperComplete = () => {
      console.log('Dashboard: Scraper completed, reloading data...');
      loadData(); // Reload from database
    };
    
    window.addEventListener('scraperComplete', handleScraperComplete);
    
    return () => {
      window.removeEventListener('scraperComplete', handleScraperComplete);
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
    <>
      {/* Database Sync Toast */}
      <ToastContainer position="bottom-end" className="p-3">
        <Toast 
          show={showSyncModal} 
          onClose={() => setShowSyncModal(false)}
          autohide={false}
          bg="light"
        >
          <Toast.Header closeButton={false}>
            <Spinner animation="border" size="sm" className="me-2" />
            <strong className="me-auto">{syncMessage}</strong>
          </Toast.Header>
          <Toast.Body>
            <ProgressBar 
              now={syncProgress} 
              animated 
              striped 
              variant="primary"
              style={{ height: '6px' }}
              className="mb-2"
            />
            <small className="text-muted">{syncProgress}% complete</small>
          </Toast.Body>
        </Toast>
      </ToastContainer>

      <Container className="dashboard-container">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="mb-0">Dashboard</h1>
        <div className="d-flex align-items-center gap-2">
          {lastSync && (
            <Badge bg="secondary">
              Last updated: {lastSync.toLocaleTimeString()}
            </Badge>
          )}
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
    </>
  );
};

export default Dashboard;
