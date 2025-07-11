# RallyUXR Project Brief

## Project Overview
RallyUXR is an economic impact monitoring application for user experience/user interface experiments. The application demonstrates how UX changes translate to business value through DiD (Differences-in-Differences) analysis.

## Core Purpose
- **Monitor economic impact** of UX/UI experiments
- **Demonstrate ROI** of design decisions through data visualization
- **Simulate realistic experiment data** for demonstration purposes
- **Provide clear economic value calculations** using configurable metric values

## Key Requirements

### Functional Requirements
1. **Create Experiments**: Users can define experiments with metrics to track
2. **Simulate Results**: Generate realistic time-series data for treatment/control groups
3. **DiD Analysis**: Automatically perform statistical analysis on experiment results
4. **Economic Impact**: Calculate dollar impact using configurable metric valuations
5. **Data Visualization**: Display results through charts and summary statistics
6. **Metric Management**: Configure economic value per unit for different metrics

### Technical Requirements
1. **AWS Cloud Native**: Deploy entirely on AWS using serverless architecture
2. **Event-Driven**: Use DynamoDB streams to trigger analysis processing
3. **Nx Monorepo**: Organize code in packages with shared types and utilities
4. **React Frontend**: Single-page application with TanStack Router
5. **CDK Infrastructure**: Infrastructure as code for repeatable deployments
6. **TypeScript**: Type safety across frontend and backend
7. **Demo Application**: Simplified workflow suitable for demonstration

## Technology Stack
- **Frontend**: React, TanStack Router, CSS Modules
- **Backend**: AWS Lambda (Node.js), API Gateway, DynamoDB
- **Infrastructure**: AWS CDK
- **Tooling**: Nx monorepo, TypeScript, Zod validation
- **Styling**: Dropbox Design-style (flat, thick borders, vibrant colors)

## Success Criteria
- Demonstrates clear economic ROI from UX experiments
- Provides realistic-looking experiment data and analysis
- Shows professional data visualization and reporting
- Maintains clean, maintainable architecture
- Deploys successfully to AWS with minimal configuration

## Scope Limitations
- **Demo Purpose**: Simplified features suitable for demonstration
- **No Authentication**: Authentication/authorization out of scope
- **Simulated Data**: All experiment data is generated, not real
- **No E2E Testing**: Testing limited to unit/integration tests
- **No Complex Filtering**: Dashboard filtering kept simple
- **Auto-Complete Experiments**: No manual start/stop controls needed