import express from 'express';
import cors from 'cors';
import serverless from 'serverless-http';
import { healthCheck } from './handlers/health.js';
import {
  createExperiment,
  listExperiments,
  getExperiment,
  getExperimentResults,
} from './handlers/experiments.js';
import {
  getAllMetricConfigurations,
  updateMetricValue,
  createMetricConfiguration,
} from './handlers/metric-values.js';
import {
  getExperimentAnalysis,
  listExperimentAnalyses,
  getSpecificAnalysis,
} from './handlers/analysis.js';

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Api-Key'],
}));

app.use(express.json({ limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, {
    headers: req.headers,
    body: req.body,
    query: req.query,
    params: req.params,
  });
  next();
});

// Health endpoint
app.get('/health', healthCheck);

// Experiments endpoints
app.post('/experiments', createExperiment);
app.get('/experiments', listExperiments);
app.get('/experiments/:id', getExperiment);
app.get('/experiments/:id/results', getExperimentResults);

// Analysis endpoints
app.get('/experiments/:experimentId/analysis', getExperimentAnalysis);
app.get('/experiments/:experimentId/analyses', listExperimentAnalyses);
app.get('/experiments/:experimentId/analyses/:analysisId', getSpecificAnalysis);

// Metric Values endpoints
app.get('/metric-values', getAllMetricConfigurations);
app.put('/metric-values/:id', updateMetricValue);
app.post('/metric-values', createMetricConfiguration);

// Catch all for unsupported routes
app.all('*', (req, res) => {
  console.log(`Unsupported route: ${req.method} ${req.path}`);
  res.status(404).json({
    error: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  });
});

// Export the handler for Lambda
export const handler = serverless(app, {
  binary: false,
  request: (request: any, event: any, context: any) => {
    console.log('Lambda event:', JSON.stringify(event));
    console.log('Lambda context:', JSON.stringify(context));
  },
  response: (response: any, event: any, context: any) => {
    console.log('Lambda response status:', response.statusCode);
    console.log('Lambda response headers:', response.headers);
  },
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`API server running on port ${port}`);
  });
}