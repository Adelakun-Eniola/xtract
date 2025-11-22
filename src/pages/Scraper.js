import React, { useState } from 'react';
import { Container, Form, Button, Card, Alert, Spinner, Table, Badge, ProgressBar } from 'react-bootstrap';
import { extractData, extractDataStream, batchExtract } from '../services/scraperService';

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
          <div className="mb-3">
            <Form.Check
              type="radio"
              label="Single Website"
              name="extractMode"
              id="singleMode"
              checked={!batchMode}
              onChange={() => setBatchMode(false)}
              className="mb-2"
            />
            <Form.Check
              type="radio"
              label="Multiple Websites (Batch Mode)"
              name="extractMode"
              id="batchMode"
              checked={batchMode}
              onChange={() => setBatchMode(true)}
            />
          </div>
          
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}
          
          {loading && statusMessage && (
            <Alert variant="info">
              <div className="d-flex align-items-center">
                <Spinner animation="border" size="sm" className="me-2" />
                <span>{statusMessage}</span>
              </div>
              {progress.total > 0 && (
                <ProgressBar 
                  now={(progress.current / progress.total) * 100} 
                  label={`${progress.current}/${progress.total}`}
                  className="mt-2"
                />
              )}
            </Alert>
          )}
          
          {!batchMode ? (
            <Form onSubmit={handleSingleExtract} className="scraper-form">
              <Form.Group className="mb-3">
                <Form.Label>Website URL or Google Maps Search URL</Form.Label>
                <Form.Control
                  type="url"
                  placeholder="https://example.com or https://www.google.com/maps/search/restaurants+in+Dallas"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={loading}
                  required
                />
                <Form.Text className="text-muted">
                  Enter a website URL or Google Maps search URL to extract multiple businesses
                </Form.Text>
              </Form.Group>
              
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
                Extract Data
              </Button>
            </Form>
          ) : (
            <Form onSubmit={handleBatchExtract} className="scraper-form">
              <Form.Group className="mb-3">
                <Form.Label>Website URLs (One per line)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={5}
                  placeholder="https://example1.com&#10;https://example2.com&#10;https://example3.com"
                  value={urls}
                  onChange={(e) => setUrls(e.target.value)}
                  disabled={loading}
                  required
                />
                <Form.Text className="text-muted">
                  Enter each URL on a new line. Include http:// or https://
                </Form.Text>
              </Form.Group>
              
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
                Extract Data
              </Button>
            </Form>
          )}
        </Card.Body>
      </Card>
      
      {results.length > 0 && (
        <Card className="mb-4">
          <Card.Header className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Extraction Results</h5>
            <Badge bg="success">{results.length} business(es) found</Badge>
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
      
      {errors.length > 0 && (
        <Card>
          <Card.Header className="bg-warning">
            <h5 className="mb-0">Errors ({errors.length})</h5>
          </Card.Header>
          <Card.Body>
            <Table responsive striped>
              <thead>
                <tr>
                  <th>Business</th>
                  <th>URL</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {errors.map((err, index) => (
                  <tr key={index}>
                    <td>{err.business_name || 'Unknown'}</td>
                    <td>
                      <a href={err.url} target="_blank" rel="noopener noreferrer">
                        {err.url}
                      </a>
                    </td>
                    <td className="text-danger">{err.error}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
};

export default Scraper;