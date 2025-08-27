import React from 'react';
import { Container, Alert, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <Container className="py-5 text-center">
      <Alert variant="warning">
        <Alert.Heading>Page Not Found</Alert.Heading>
        <p>The page you are looking for does not exist.</p>
      </Alert>
      <Button as={Link} to="/" variant="primary">
        Return to Home
      </Button>
    </Container>
  );
};

export default NotFound;