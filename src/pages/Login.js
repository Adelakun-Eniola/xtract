import React, { useState, useEffect } from 'react';
import { Container, Card, Alert } from 'react-bootstrap';
import { GoogleLogin } from '@react-oauth/google';
import { googleLogin } from '../services/authService';

const Login = ({ setIsAuthenticated, setUser }) => {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Only clear authentication-related data, preserve dashboard data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();
    console.log('Cleared authentication data (preserving dashboard data)');
  }, []);

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      console.log('=== Google Login Process Started ===');
      console.log('Credential response:', credentialResponse);
      
      if (!credentialResponse || !credentialResponse.credential) {
        throw new Error('No credential received from Google');
      }
      
      const freshToken = credentialResponse.credential;
      console.log('Fresh Google Token received at:', new Date().toISOString());
      console.log('Token (first 100 chars):', freshToken.substring(0, 100) + '...');
      
      setError(''); // Clear any previous errors
      console.log('Calling backend API...');
      
      const userData = await googleLogin(freshToken);
      console.log('Backend response:', userData);
      
      if (userData) {
        console.log('Setting user data and authentication...');
        setUser(userData);
        setIsAuthenticated(true);
        console.log('Login successful at:', new Date().toISOString());
        console.log('=== Login Process Complete ===');
      } else {
        throw new Error('No user data received from backend');
      }
    } catch (err) {
      console.error('=== Google Login Error ===');
      console.error('Error details:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      console.error('Error timestamp:', new Date().toISOString());
      
      const errorMessage = err.response?.data?.error || err.message || 'Unknown login error';
      setError('Failed to login with Google: ' + errorMessage);
    }
  };

  const handleGoogleError = (error) => {
    console.error('=== Google Login Error ===');
    console.error('Error details:', error);
    
    let errorMessage = 'Google login failed. Please try again.';
    
    if (error && typeof error === 'object') {
      if (error.error === 'popup_blocked_by_browser') {
        errorMessage = 'Popup was blocked by browser. Please allow popups and try again.';
      } else if (error.error === 'access_denied') {
        errorMessage = 'Access denied. Please grant permission to continue.';
      } else if (error.error === 'popup_closed_by_user') {
        errorMessage = 'Login was cancelled. Please try again.';
      }
    }
    
    setError(errorMessage);
    console.error('Google login failed:', errorMessage);
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
                auto_select={false}
                cancel_on_tap_outside={true}
                type="standard"
                width="350"
                locale="en"
              />
              
              {error && error.includes('popup') && (
                <div className="mt-2">
                  <small className="text-muted">
                    Having trouble? Try disabling popup blockers or use an incognito window.
                  </small>
                </div>
              )}
            </div>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default Login;