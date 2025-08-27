import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Spinner, Alert } from 'react-bootstrap';
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [userData, statsData] = await Promise.all([
          getUserData(),
          getStats()
        ]);
        
        setData(userData.data);
        setStats(statsData);
        setError('');
      } catch (err) {
        setError('Failed to load dashboard data. Please try again later.');
        console.error('Dashboard data error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const chartData = {
    labels: ['Email', 'Phone', 'Address'],
    datasets: [
      {
        label: 'Success Rate (%)',
        data: stats ? [stats.email_success_rate, stats.phone_success_rate, stats.address_success_rate] : [0, 0, 0],
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
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Data Extraction Success Rate',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
      },
    },
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <Container className="dashboard-container">
      <h1 className="mb-4">Dashboard</h1>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      {stats && (
        <Row className="mb-4">
          <Col md={3}>
            <Card className="stats-card text-center">
              <Card.Body>
                <Card.Title>Total Entries</Card.Title>
                <Card.Text className="display-4">{stats.total_entries}</Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="stats-card text-center">
              <Card.Body>
                <Card.Title>Emails Found</Card.Title>
                <Card.Text className="display-4">{stats.with_email}</Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="stats-card text-center">
              <Card.Body>
                <Card.Title>Phones Found</Card.Title>
                <Card.Text className="display-4">{stats.with_phone}</Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="stats-card text-center">
              <Card.Body>
                <Card.Title>Addresses Found</Card.Title>
                <Card.Text className="display-4">{stats.with_address}</Card.Text>
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
              {data.length === 0 ? (
                <p className="text-center">No data extracted yet. Go to the Extract Data page to get started.</p>
              ) : (
                <Table responsive striped hover className="data-table">
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Website</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((item) => (
                      <tr key={item.id}>
                        <td>{item.company_name || 'Unknown'}</td>
                        <td>{item.email || 'Not found'}</td>
                        <td>{item.phone || 'Not found'}</td>
                        <td>
                          <a href={item.website_url} target="_blank" rel="noopener noreferrer">
                            {item.website_url}
                          </a>
                        </td>
                        <td>{new Date(item.created_at).toLocaleDateString()}</td>
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