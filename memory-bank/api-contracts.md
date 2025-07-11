# RallyUXR API Contracts & Data Layer Design

## Table of Contents
1. [DynamoDB Data Schemas](#dynamodb-data-schemas)
2. [REST API Contracts](#rest-api-contracts)
3. [Lambda Message Passing](#lambda-message-passing)
4. [Frontend-Backend Integration](#frontend-backend-integration)
5. [Time Series Data Structure](#time-series-data-structure)

## DynamoDB Data Schemas

### 1. experimentDefinition Table

```typescript
interface ExperimentDefinition {
  // Primary Key
  id: string;                          // UUID
  
  // Basic Info
  name: string;
  description: string;
  status: 'draft' | 'running' | 'complete' | 'archived';
  
  // Configuration
  metrics: string[];                   // Array of metric IDs to track
  startDate: string;                   // ISO 8601 date string
  endDate: string;                     // ISO 8601 date string
  expectedOutcome: 'positive' | 'negative' | 'neutral';
  
  // Metadata
  createdAt: string;                   // ISO 8601 timestamp
  updatedAt: string;                   // ISO 8601 timestamp
  createdBy?: string;                  // User ID (future feature)
}
```

### 2. experimentResults Table

```typescript
interface ExperimentResult {
  // Primary Key
  experimentId: string;                // Partition Key
  
  // Experiment Data
  metrics: {
    [metricId: string]: {
      timeSeries: Array<{
        timestamp: string;             // ISO 8601 datetime (hourly intervals)
        treatmentValue: number;        // Metric value for treatment group
        controlValue: number;          // Metric value for control group
        treatmentSampleSize: number;   // Number of users in treatment
        controlSampleSize: number;     // Number of users in control
      }>;
      summary: {
        treatmentMean: number;         // Average treatment value over period
        controlMean: number;           // Average control value over period
        totalTreatmentSamples: number; // Total treatment participants
        totalControlSamples: number;   // Total control participants
      };
    };
  };
  
  // Metadata
  generatedAt: string;                 // When this data was created
  experimentPeriod: {
    startDate: string;                 // ISO 8601 date
    endDate: string;                   // ISO 8601 date
    totalHours: number;                // Number of data points
  };
}
```

### 3. experimentAnalysis Table

```typescript
interface ExperimentAnalysis {
  // Primary Key
  experimentId: string;                // Partition Key
  analysisId: string;                  // Sort Key: timestamp-based UUID
  
  // DiD Analysis Results
  didResults: {
    [metricId: string]: {
      treatmentMean: number;           // Average treatment value
      controlMean: number;             // Average control value
      absoluteDifference: number;      // Treatment - Control
      relativeDifference: number;      // (Treatment - Control) / Control
      pValue: number;                  // Statistical significance
      confidenceLevel: number;         // 95, 99, etc.
      confidenceInterval: {
        lower: number;
        upper: number;
      };
      sampleSizeControl: number;
      sampleSizeTreatment: number;
      effectSize: number;              // Cohen's d or similar
    };
  };
  
  // Economic Impact Calculation
  economicImpact: {
    totalImpact: number;               // Total dollar impact
    annualizedImpact: number;          // Projected annual impact
    roiPercentage: number;             // Return on investment
    metricBreakdown: {
      [metricId: string]: {
        dollarImpact: number;          // Impact for this specific metric
        metricValueUsed: number;       // Dollar/unit value used in calculation
        metricChange: number;          // Absolute change in metric
      };
    };
  };
  
  // Snapshot of Metric Values (for historical accuracy)
  metricValuesSnapshot: {
    [metricId: string]: {
      dollarsPerUnit: number;
      description: string;
      unit: string;
    };
  };
  
  // Analysis Metadata
  analysisTimestamp: string;           // When analysis was performed
  experimentPeriod: {
    startDate: string;
    endDate: string;
    durationDays: number;
  };
  status: 'processing' | 'complete' | 'failed';
  version: string;                     // Analysis algorithm version
}
```

### 4. metricValues Table

```typescript
interface MetricValue {
  // Primary Key
  metricId: string;                    // e.g., "conversion_rate", "aov", "ctr"
  
  // Economic Value
  dollarsPerUnit: number;              // Dollar value per unit increase
  unit: string;                        // "%", "$", "seconds", etc.
  
  // Metadata
  name: string;                        // Human-readable name
  description: string;                 // Explanation of economic calculation
  category: 'conversion' | 'revenue' | 'engagement' | 'retention' | 'other';
  
  // Version History
  lastUpdated: string;                 // ISO 8601 timestamp
  updatedBy?: string;                  // User ID (future feature)
  version: number;                     // Incremental version number
  
  // Validation Rules
  validationRules?: {
    minValue?: number;
    maxValue?: number;
    decimalPlaces?: number;
  };
}
```

## REST API Contracts

### Base URL Structure
```
Base URL will be provided via environment variables
Endpoints documented with relative paths: /experiments, /metric-values, etc.
```

### Headers
```
Content-Type: application/json
CORS: Enabled for all origins (configured in API Gateway)
```

### 1. Experiments Endpoints

#### POST /experiments
Create a new experiment

**Request:**
```typescript
{
  name: string;
  description: string;
  metrics: string[];                   // Array of metric IDs
  startDate: string;                   // ISO 8601
  endDate: string;                     // ISO 8601
  expectedOutcome: 'positive' | 'negative' | 'neutral';
}
```

**Response (201 Created):**
```typescript
{
  success: true;
  data: {
    experimentId: string;
    status: 'draft';
    message: 'Experiment created successfully';
    estimatedCompletionTime: string;   // When results will be ready
  };
}
```

#### GET /experiments
List all experiments

**Query Parameters:**
```
?limit=20
&offset=0
```

**Response (200 OK):**
```typescript
{
  success: true;
  data: {
    experiments: ExperimentDefinition[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
    summary: {
      totalExperiments: number;
      completedExperiments: number;
      totalEconomicImpact: number;
    };
  };
}
```

#### GET /experiments/{id}
Get experiment details

**Response (200 OK):**
```typescript
{
  success: true;
  data: {
    experiment: ExperimentDefinition;
    hasResults: boolean;
    hasAnalysis: boolean;
    participantCount?: number;
  };
}
```

#### GET /experiments/{id}/results
Get experiment results with analysis

**Response (200 OK):**
```typescript
{
  success: true;
  data: {
    experiment: ExperimentDefinition;
    results: ExperimentResult;         // Raw time series data
    analysis: ExperimentAnalysis;      // DiD analysis and economic impact
  };
}
```


### 2. Metric Values Endpoints

#### GET /metric-values
Get all metric value configurations

**Response (200 OK):**
```typescript
{
  success: true;
  data: {
    metrics: MetricValue[];
    categories: string[];
    totalMetrics: number;
  };
}
```

#### PUT /metric-values/{id}
Update metric value configuration

**Request:**
```typescript
{
  dollarsPerUnit: number;
  description?: string;
  validationRules?: {
    minValue?: number;
    maxValue?: number;
    decimalPlaces?: number;
  };
}
```

**Response (200 OK):**
```typescript
{
  success: true;
  data: {
    metric: MetricValue;
    previousValue: number;
    impactedExperiments: number;  // How many active experiments use this metric
  };
}
```

#### POST /metric-values
Create new metric value

**Request:**
```typescript
{
  metricId: string;
  name: string;
  dollarsPerUnit: number;
  unit: string;
  description: string;
  category: string;
  validationRules?: Record<string, any>;
}
```

#### GET /metric-values/{id}/history
Get version history of metric value changes

**Response (200 OK):**
```typescript
{
  success: true;
  data: {
    history: Array<{
      version: number;
      dollarsPerUnit: number;
      updatedAt: string;
      updatedBy?: string;
      changeReason?: string;
    }>;
  };
}
```

### 3. Health Check & System Endpoints

#### GET /health
System health check

**Response (200 OK):**
```typescript
{
  success: true;
  data: {
    status: 'healthy';
    timestamp: string;
    services: {
      database: 'healthy' | 'degraded' | 'down';
      analysisEngine: 'healthy' | 'degraded' | 'down';
      resultsGenerator: 'healthy' | 'degraded' | 'down';
    };
    version: string;
  };
}
```

## Lambda Message Passing

### 1. Main API → Results Generator

**Trigger:** Async Lambda invocation after experiment creation

**Message:**
```typescript
{
  eventType: 'EXPERIMENT_CREATED';
  experimentId: string;
  experiment: ExperimentDefinition;
  timestamp: string;
  requestId: string;
}
```

**Results Generator Response:**
```typescript
{
  success: boolean;
  experimentId: string;
  resultsGenerated: number;        // Number of data points created
  metricsProcessed: string[];
  timeRange: {
    startDate: string;
    endDate: string;
    granularity: 'hourly';
  };
  error?: string;
}
```

### 2. DynamoDB Stream → Analysis Processor

**Trigger:** DynamoDB Stream event from experimentResults table

**Stream Event:**
```typescript
{
  eventName: 'INSERT' | 'MODIFY';
  dynamodb: {
    Keys: {
      experimentId: { S: string };
      metricTimepoint: { S: string };
    };
    NewImage: {
      // DynamoDB representation of ExperimentResult
    };
  };
  eventSourceARN: string;
}
```

**Analysis Processor Action:**
1. Aggregate all results for the experiment
2. Perform DiD analysis
3. Calculate economic impact
4. Store in experimentAnalysis table

## Frontend-Backend Integration

### 1. Create Experiment Flow

**Frontend Action:**
```typescript
// User submits form
const response = await fetch('/api/experiments', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Button Color A/B Test',
    description: 'Testing red vs blue CTA button',
    metrics: ['conversion_rate', 'ctr'],
    startDate: '2025-01-15',
    endDate: '2025-01-29',
    expectedOutcome: 'positive'
  })
});

const result = await response.json();
// { experimentId: "123", status: "draft", estimatedCompletionTime: "2025-01-15T10:30:00Z" }
```

### 2. Dashboard Data Loading

**Frontend Request:**
```typescript
const [experiments, metrics] = await Promise.all([
  fetch('/api/experiments?limit=50'),
  fetch('/api/metric-values')
]);

const dashboardData = {
  experiments: experimentsResponse.data.experiments,
  summary: experimentsResponse.data.summary,
  metrics: metricsResponse.data.metrics
};
```

### 3. Results Visualization

**Frontend Request for Time Series:**
```typescript
const response = await fetch(
  `/api/experiments/${experimentId}/results`
);

const { results, analysis } = response.data;

// Render charts using time series data
results.metrics.conversion_rate.timeSeries.forEach(point => {
  // point.timestamp, point.treatmentValue, point.controlValue
});

// Economic impact from analysis
const economicImpact = analysis.economicImpact;
```

## Time Series Data Structure

### Hourly Granularity Storage
```typescript
// Stored in DynamoDB as single record per experiment:
{
  experimentId: "exp_123",
  metrics: {
    "conversion_rate": {
      timeSeries: [
        {
          timestamp: "2025-01-15T14:00:00Z",
          treatmentValue: 0.032,
          controlValue: 0.024,
          treatmentSampleSize: 1247,
          controlSampleSize: 1189
        },
        // ... more hourly data points
      ],
      summary: {
        treatmentMean: 0.029,
        controlMean: 0.023,
        totalTreatmentSamples: 28470,
        totalControlSamples: 26910
      }
    }
  }
}
```

### Frontend Chart Data Transformation
```typescript
// Transform API response for chart libraries
const { results, analysis } = response.data;
const conversionData = results.metrics.conversion_rate;

const chartData = conversionData.timeSeries.map(point => ({
  date: new Date(point.timestamp),
  treatment: point.treatmentValue * 100,  // Convert to percentage
  control: point.controlValue * 100,
  difference: (point.treatmentValue - point.controlValue) * 100
}));

// Economic impact comes from analysis
const economicImpact = analysis.economicImpact;
```

## Error Handling & Status Codes

### Standard Error Response
```typescript
{
  success: false;
  error: {
    code: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'SERVER_ERROR';
    message: string;
    details?: Record<string, any>;
    requestId: string;
  };
}
```

### HTTP Status Codes
- **200**: Successful GET/PUT requests
- **201**: Successful POST (creation)
- **400**: Bad request/validation errors
- **404**: Resource not found
- **409**: Conflict (e.g., experiment already running)
- **500**: Internal server error
- **503**: Service temporarily unavailable

## Data Validation with Zod

### Example Zod Schemas
```typescript
import { z } from 'zod';

export const CreateExperimentSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000),
  metrics: z.array(z.string()).min(1).max(10),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  expectedOutcome: z.enum(['positive', 'negative', 'neutral'])
});

export const MetricValueSchema = z.object({
  metricId: z.string().regex(/^[a-z_]+$/),
  dollarsPerUnit: z.number().positive(),
  unit: z.string().min(1),
  description: z.string().min(10).max(500),
  category: z.enum(['conversion', 'revenue', 'engagement', 'retention', 'other'])
});
```

This comprehensive API design supports all the UI features from the mockups, including time series visualization, economic impact calculations, experiment management, and metric value configuration.