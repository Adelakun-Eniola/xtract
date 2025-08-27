import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Scraper from './pages/Scraper';
import NotFound from './pages/NotFound';

// Components
import Navigation from './components/Navigation';
import ProtectedRoute from './components/ProtectedRoute';

// Services
import { checkAuth } from './services/authService';

console.log('REACT_APP_GOOGLE_CLIENT_ID:', process.env.REACT_APP_GOOGLE_CLIENT_ID);

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const userData = await checkAuth();
        if (userData) {
          setIsAuthenticated(true);
          setUser(userData);
        }
      } catch (error) {
        console.error('Authentication error:', error);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    verifyAuth();
  }, []);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID || 'your-client-id'}>
      <Router>
        {isAuthenticated && <Navigation user={user} setIsAuthenticated={setIsAuthenticated} />}
        <div className={isAuthenticated ? 'container mt-4' : ''}>
          <Routes>
            <Route 
              path="/" 
              element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login setIsAuthenticated={setIsAuthenticated} setUser={setUser} />} 
            />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <Dashboard user={user} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/scraper" 
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <Scraper user={user} />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;