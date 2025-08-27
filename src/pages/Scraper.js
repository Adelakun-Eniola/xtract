import React, { useState } from 'react';
import { Container, Form, Button, Card, Alert, Spinner, Table } from 'react-bootstrap';
import { extractData, batchExtract } from '../services/scraperService';

const Scraper = () => {
  const [url, setUrl] = useState('');
  const [urls, setUrls] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState([]);
  const [batchMode, setBatchMode] = useState(false);

  const handleSingleExtract = async (e) => {
    e.preventDefault();
    
    if (!url) {
      setError('Please enter a website URL');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const response = await extractData(url);
      setResults([response.data]);
      setUrl('');
    } catch (err) {
      setError('Failed to extract data. Please check the URL and try again.');
      console.error('Extraction error:', err);
    } finally {
      setLoading(false);
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
      
      const response = await batchExtract(urlList);
      setResults(response.results);
      
      if (response.errors && response.errors.length > 0) {
        setError(`${response.errors.length} URLs failed to process. Check console for details.`);
        console.error('Batch extraction errors:', response.errors);
      }
      
      setUrls('');
    } catch (err) {
      setError('Failed to process batch extraction. Please try again.');
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
          
          {!batchMode ? (
            <Form onSubmit={handleSingleExtract} className="scraper-form">
              <Form.Group className="mb-3">
                <Form.Label>Website URL</Form.Label>
                <Form.Control
                  type="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={loading}
                  required
                />
                <Form.Text className="text-muted">
                  Enter the full URL including http:// or https://
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
        <Card>
          <Card.Header>
            <h5 className="mb-0">Extraction Results</h5>
          </Card.Header>
          <Card.Body>
            <Table responsive striped hover>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Website</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={index}>
                    <td>{result.company_name || 'Unknown'}</td>
                    <td>{result.email || 'Not found'}</td>
                    <td>{result.phone || 'Not found'}</td>
                    <td>{result.address || 'Not found'}</td>
                    <td>
                      <a href={result.website_url} target="_blank" rel="noopener noreferrer">
                        {result.website_url}
                      </a>
                    </td>
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