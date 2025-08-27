import React, { useState, useEffect } from 'react';
import { Container, Card, Alert } from 'react-bootstrap';
import { GoogleLogin } from '@react-oauth/google';
import { googleLogin } from '../services/authService';

const Login = ({ setIsAuthenticated, setUser }) => {
  const [error, setError] = useState('');

  useEffect(() => {
    localStorage.clear();
    sessionStorage.clear();
    console.log('Cleared local and session storage');
  }, []);

  const handleGoogleSuccess = async (credentialResponse) => {
  try {
    const freshToken = credentialResponse.credential;
    console.log('Fresh Google Token received at:', new Date().toISOString());
    console.log('Token (first 100 chars):', freshToken.substring(0, 100) + '...');
    const userData = await googleLogin(freshToken);
    if (userData) {
      setUser(userData);
      setIsAuthenticated(true);
      console.log('Login successful at:', new Date().toISOString());
    }
  } catch (err) {
    setError('Failed to login with Google: ' + err.message);
    console.error('Google login error:', err);
    console.error('Error timestamp:', new Date().toISOString());
  }
};

  const handleGoogleError = () => {
    setError('Google login failed. Please try again.');
    console.error('Google login failed');
  };

  return (
    <div className="auth-container">
      <Container className="d-flex justify-content-center align-items-center">
        <Card style={{ width: '400px', padding: '20px' }}>
          <Card.Body className="text-center">
            <Card.Title as="h2" className="mb-4">Company Data Extractor</Card.Title>
            <Card.Text className="mb-4">
              Extract company details from websites with ease.
            </Card.Text>
            {error && <Alert variant="danger">{error}</Alert>}
            <div className="d-grid gap-2">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap={false}
                theme="filled_blue"
                text="signin_with"
                shape="rectangular"
                size="large"
              />
            </div>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default Login;