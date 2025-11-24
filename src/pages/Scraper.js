import React, { useState } from 'react';
import { Container, Form, Button, Card, Alert, Spinner, Table, Badge, ProgressBar, ListGroup } from 'react-bootstrap';
import { extractData, extractDataStream, batchExtract, searchBusinesses, searchBusinessesStream, searchAddressesStream } from '../services/scraperService';

const Scraper = () => {
  const [url, setUrl] = useState('');
  const [urls, setUrls] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [results, setResults] = useState([]);
  const [errors, setErrors] = useState([]);
  const [batchMode, setBatchMode] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [statusMessage, setStatusMessage] = useState('');
  const [businesses, setBusinesses] = useState([]);
  const [showBusinessList, setShowBusinessList] = useState(false);

  const handleSearchAddresses = async (e) => {
    e.preventDefault();
    
    if (!url) {
      setError('Please enter a Google Maps search URL');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      setBusinesses([]);
      setShowBusinessList(false);
      setProgress({ current: 0, total: 0 });
      setStatusMessage('Searching for businesses and extracting phone numbers, addresses & websites...');
      
      await searchAddressesStream(url, (event) => {
        console.log('Frontend received address event:', event.type, event);
        
        if (event.type === 'status') {
          setStatusMessage(event.message);
          if (event.total) {
            setProgress({ current: 0, total: event.total });
            setShowBusinessList(true);
          }
        } else if (event.type === 'business') {
          // Add business immediately as it comes in
          setBusinesses(prev => [...prev, event.data]);
          setProgress(event.progress);
          setStatusMessage(`Extracted ${event.progress.current} of ${event.progress.total} businesses...`);
        } else if (event.type === 'complete') {
          setSuccess(event.message || `Found ${event.total} businesses`);
          setStatusMessage('');
          setLoading(false);
        } else if (event.type === 'error') {
          setError(event.error);
          setLoading(false);
        }
      });
      
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to search addresses. Please check the URL and try again.';
      setError(errorMsg);
      console.error('Address search error:', err);
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  const handleSearchBusinesses = async (e, includePhone = false) => {
    e.preventDefault();
    
    if (!url) {
      setError('Please enter a Google Maps search URL');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      setBusinesses([]);
      setShowBusinessList(false);
      setProgress({ current: 0, total: 0 });
      setStatusMessage(includePhone ? 'Searching for businesses and extracting phone numbers...' : 'Searching for businesses...');
      
      // Use streaming for phone extraction
      if (includePhone) {
        await searchBusinessesStream(url, (event) => {
          console.log('Frontend received event:', event.type, event);
          
          if (event.type === 'status') {
            setStatusMessage(event.message);
            if (event.total) {
              setProgress({ current: 0, total: event.total });
              setShowBusinessList(true);
            }
          } else if (event.type === 'business') {
            // Add business immediately as it comes in
            setBusinesses(prev => [...prev, event.data]);
            setProgress(event.progress);
            setStatusMessage(`Extracted ${event.progress.current} of ${event.progress.total} businesses...`);
          } else if (event.type === 'complete') {
            setSuccess(event.message || `Found ${event.total} businesses`);
            setStatusMessage('');
            setLoading(false);
          } else if (event.type === 'error') {
            setError(event.error);
            setLoading(false);
          }
        });
      } else {
        // Regular search without phones
        const response = await searchBusinesses(url, false);
        
        if (response.businesses && response.businesses.length > 0) {
          setBusinesses(response.businesses);
          setShowBusinessList(true);
          setSuccess(response.message || `Found ${response.count} businesses`);
        } else {
          setError('No businesses found in this search');
        }
      }
      
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to search businesses. Please check the URL and try again.';
      setError(errorMsg);
      console.error('Search error:', err);
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  const handleSingleExtract = async (e) => {
    e.preventDefault();
    
    if (!url) {
      setError('Please enter a website URL or Google Maps search URL');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      setErrors([]);
      setResults([]);
      setProgress({ current: 0, total: 0 });
      setStatusMessage('');
      
      // Check if it's a Google Maps URL - try streaming, fallback to regular
      const isGoogleMaps = url.includes('google.com/maps/search');
      
      if (isGoogleMaps) {
        // Try streaming for Google Maps
        setStatusMessage('Connecting to scraper...');
        
        try {
          await extractDataStream(url, (event) => {
          if (event.type === 'status') {
            setStatusMessage(event.message);
            if (event.total) {
              setProgress({ current: 0, total: event.total });
            }
          } else if (event.type === 'result') {
            // Add result immediately as it comes in
            setResults(prev => [...prev, event.data]);
            setProgress(event.progress);
            setStatusMessage(`Scraped ${event.progress.current} of ${event.progress.total} businesses...`);
          } else if (event.type === 'error') {
            setErrors(prev => [...prev, event.error]);
          } else if (event.type === 'complete') {
            setSuccess(`Successfully extracted ${event.results.length} business(es)`);
            setStatusMessage('');
            setLoading(false);
          }
          });
        } catch (streamError) {
          // Fallback to regular extraction if streaming fails
          console.log('Streaming failed, falling back to regular extraction:', streamError);
          setStatusMessage('Using standard extraction...');
          
          const response = await extractData(url);
          if (response.data && Array.isArray(response.data)) {
            setResults(response.data);
            setSuccess(response.message || `Successfully extracted ${response.data.length} business(es)`);
            if (response.errors && response.errors.length > 0) {
              setErrors(response.errors);
            }
          }
        }
        
      } else {
        // Use regular extraction for single websites
        const response = await extractData(url);
        
        if (response.data && Array.isArray(response.data)) {
          setResults(response.data);
          setSuccess(response.message || `Successfully extracted ${response.data.length} business(es)`);
          
          if (response.errors && response.errors.length > 0) {
            setErrors(response.errors);
          }
        } else {
          setResults([response.data]);
          setSuccess(response.message || 'Data extracted successfully');
        }
      }
      
      setUrl('');
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to extract data. Please check the URL and try again.';
      setError(errorMsg);
      console.error('Extraction error:', err);
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  const handleBatchExtract = async (e) => {
    e.preventDefault();
    
    if (!urls) {
      setError('Please enter website URLs');
      return;
    }
    
    // Split URLs by newline and filter empty lines
    const urlList = urls.split('\n').map(url => url.trim()).filter(url => url);
    
    if (urlList.length === 0) {
      setError('Please enter at least one valid URL');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      setErrors([]);
      
      const response = await batchExtract(urlList);
      setResults(response.results || []);
      
      if (response.errors && response.errors.length > 0) {
        setErrors(response.errors);
      }
      
      setSuccess(response.message || `Successfully processed ${response.results?.length || 0} URL(s)`);
      setUrls('');
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to process batch extraction. Please try again.';
      setError(errorMsg);
      console.error('Batch extraction error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-4">
      <h1 className="mb-4">Extract Company Data</h1>
      
      <Card className="mb-4">
        <Card.Body>
          <h5 className="mb-3">Step 1: Find Businesses</h5>
          
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}
          
          {loading && statusMessage && (
            <Alert variant="info">
              <div className="d-flex align-items-center">
                <Spinner animation="border" size="sm" className="me-2" />
                <span>{statusMessage}</span>
              </div>
            </Alert>
          )}
          
          <Form onSubmit={handleSearchBusinesses} className="scraper-form">
            <Form.Group className="mb-3">
              <Form.Label>Google Maps Search URL</Form.Label>
              <Form.Control
                type="url"
                placeholder="https://www.google.com/maps/search/insurance+companies+in+texas/@31.42169,-99.1707502,8z"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
                required
              />
              <Form.Text className="text-muted">
                Paste your Google Maps search URL to find all available businesses
              </Form.Text>
            </Form.Group>
            
            <div className="d-flex gap-2">
              <Button 
                variant="primary" 
                type="submit" 
                disabled={loading}
                className="d-flex align-items-center"
              >
                {loading && (
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                )}
                Search Businesses
              </Button>
              
              <Button 
                variant="success" 
                onClick={(e) => handleSearchBusinesses(e, true)}
                disabled={loading}
                className="d-flex align-items-center"
                title="Extracts phone numbers for all businesses (shows results in real-time)"
              >
                {loading && (
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                )}
                Get Phone Numbers (All)
              </Button>
              
              <Button 
                variant="info" 
                onClick={handleSearchAddresses}
                disabled={loading}
                className="d-flex align-items-center"
                title="Extracts phone numbers, addresses, and websites for all businesses (shows results in real-time)"
              >
                {loading && (
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                )}
                Get All Details (Phone, Address, Website)
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
      
      {showBusinessList && businesses.length > 0 && (
        <Card className="mb-4">
          <Card.Header className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Found {businesses.length} Businesses</h5>
            <Badge bg="success">{businesses.length} results</Badge>
          </Card.Header>
          <Card.Body>
            <ListGroup>
              {businesses.map((business, index) => (
                <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center">
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center mb-1">
                      <Badge bg="secondary" className="me-2">#{business.index}</Badge>
                      <strong>{business.name || 'Unknown Business'}</strong>
                    </div>
                    {business.phone && (
                      <div className="text-success mb-1">
                        <span className="me-1">📞</span>
                        <strong>{business.phone}</strong>
                      </div>
                    )}
                    {business.address && (
                      <div className="text-info mb-1">
                        <span className="me-1">📍</span>
                        <strong>{business.address}</strong>
                      </div>
                    )}
                    {business.website && business.website !== 'N/A' && (
                      <div className="text-primary mb-1">
                        <span className="me-1">🌐</span>
                        <a href={business.website} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
                          <strong>{business.website}</strong>
                        </a>
                      </div>
                    )}
                    <div className="text-muted small text-truncate" style={{maxWidth: '600px'}}>
                      {business.url}
                    </div>
                  </div>
                  <a href={business.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary ms-2">
                    View
                  </a>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Card.Body>
        </Card>
      )}
      
      {results.length > 0 && (
        <Card className="mb-4">
          <Card.Header className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">✅ Successfully Extracted {results.length} Business{results.length !== 1 ? 'es' : ''}</h5>
            <Badge bg="success">{results.length} results</Badge>
          </Card.Header>
          <Card.Body>
            <Table responsive striped hover>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Company</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Website</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={result.id || index}>
                    <td>{index + 1}</td>
                    <td>{result.company_name || 'Unknown'}</td>
                    <td>{result.email || 'Not found'}</td>
                    <td>{result.phone || 'Not found'}</td>
                    <td>{result.address || 'Not found'}</td>
                    <td>
                      {result.website_url ? (
                        <a href={result.website_url} target="_blank" rel="noopener noreferrer">
                          View
                        </a>
                      ) : (
                        'Not found'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}
      
      {errors.length > 0 && results.length === 0 && (
        <Alert variant="warning">
          <strong>No results found.</strong> The scraper couldn't extract data from the businesses. This might be because they don't have websites listed on Google Maps.
        </Alert>
      )}
    </Container>
  );
};

export default Scraper;