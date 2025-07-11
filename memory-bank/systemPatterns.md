# System Patterns & Architecture

## Overall Architecture Pattern
**Event-Driven Serverless Architecture** with clear separation of concerns across data, business logic, and presentation layers.

## Key Architectural Patterns

### 1. Event-Driven Processing
- **Pattern**: DynamoDB Streams trigger downstream processing
- **Implementation**: Results generation triggers analysis via stream events
- **Benefit**: Decoupled, scalable processing without manual orchestration
- **Usage**: ExperimentResults table changes automatically trigger DiD analysis

### 2. Single-Record Aggregation
- **Pattern**: Store complete experiment data in single DynamoDB record
- **Implementation**: Nested JSON structure with all metrics and time-series data
- **Benefit**: Simplified queries, atomic updates, reduced complexity
- **Usage**: ExperimentResults table contains full experiment dataset per record

### 3. Async Lambda Processing
- **Pattern**: API returns immediately, processing continues in background
- **Implementation**: Main API Lambda async-invokes Results Generator Lambda
- **Benefit**: Fast API response times, no timeout issues
- **Usage**: Experiment creation triggers background data generation

### 4. Shared Type System
- **Pattern**: Common TypeScript interfaces across frontend and backend
- **Implementation**: Shared package with Zod schemas and TypeScript types
- **Benefit**: Type safety, consistent data structures, reduced errors
- **Usage**: ExperimentDefinition, ExperimentResult, MetricValue interfaces

## Component Relationships

### Data Layer
```
experimentDefinition (1) → (1) experimentResults → (1) experimentAnalysis
                     ↓                                        ↑
                metricValues (n) ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
```

### Service Dependencies
```
Frontend → API Gateway → Main API Lambda ↘
                                          → Results Generator → Analysis Processor
                                          ↗
                              DynamoDB ← ← 
```

## Data Flow Patterns

### 1. Experiment Creation Flow
```
User Input → Form Validation → API Call → DDB Write → Async Processing → Analysis → Complete
```

### 2. Results Viewing Flow  
```
User Request → API Query → Aggregate (Results + Analysis) → Transform → Display
```

### 3. Metric Management Flow
```
User Edit → Validation → API Update → DDB Write → Version History
```

## Error Handling Patterns

### 1. Graceful Degradation
- **Pattern**: Continue processing even if non-critical components fail
- **Implementation**: Analysis continues if some metrics fail processing
- **Benefit**: Robust system that provides partial results over no results

### 2. Idempotent Operations
- **Pattern**: Repeated operations have same effect as single operation
- **Implementation**: Experiment IDs ensure duplicate submissions are ignored
- **Benefit**: Safe retries, consistent state

### 3. Structured Error Responses
- **Pattern**: Consistent error format across all API endpoints
- **Implementation**: Standard `{ success, error: { code, message, details } }` format
- **Benefit**: Predictable error handling in frontend

## Security Patterns

### 1. Infrastructure Security
- **Pattern**: AWS IAM roles with minimal required permissions
- **Implementation**: Lambda execution roles limited to specific DynamoDB tables
- **Benefit**: Principle of least privilege

### 2. Data Validation
- **Pattern**: Input validation at API boundary using Zod schemas
- **Implementation**: All request bodies validated before processing
- **Benefit**: Prevent invalid data from entering system

### 3. CORS Configuration
- **Pattern**: API Gateway configured for cross-origin requests
- **Implementation**: CORS headers for frontend domain access
- **Benefit**: Secure browser-based API access

## Scalability Patterns

### 1. Serverless Auto-Scaling
- **Pattern**: Lambda functions scale automatically with demand
- **Implementation**: No capacity planning required
- **Benefit**: Cost-effective scaling, zero idle costs

### 2. DynamoDB On-Demand
- **Pattern**: Database auto-scales based on actual usage
- **Implementation**: Pay-per-request pricing model
- **Benefit**: No capacity planning, handles traffic spikes

### 3. CDN Distribution
- **Pattern**: CloudFront distributes static assets globally
- **Implementation**: S3 origin with global edge locations
- **Benefit**: Fast content delivery regardless of user location

## Monitoring Patterns

### 1. Health Check Endpoints
- **Pattern**: Dedicated endpoints for system health monitoring
- **Implementation**: `/health` endpoint checks all dependencies
- **Benefit**: Automated monitoring and alerting capabilities

### 2. Structured Logging
- **Pattern**: Consistent log format across all components
- **Implementation**: JSON logs with request IDs, timestamps, and context
- **Benefit**: Easy searching and correlation in CloudWatch

### 3. Request Tracing
- **Pattern**: Trace requests across component boundaries
- **Implementation**: Request IDs passed through all processing steps
- **Benefit**: End-to-end debugging and performance analysis