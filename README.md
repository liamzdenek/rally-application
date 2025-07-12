# RallyUXR Economic Impact Monitoring Platform

A cloud-native application that quantifies the economic impact of UX/UI experiments using Differences-in-Differences (DiD) statistical analysis. Built to demonstrate how design decisions translate to measurable business value.

## 🎯 Purpose

RallyUXR addresses a critical challenge in product development: **proving the ROI of UX improvements**. Design teams often struggle to demonstrate business value, while product leaders need concrete evidence to justify design investments.

This platform bridges that gap by:
- Systematically tracking UX experiments with defined metrics
- Applying rigorous DiD statistical analysis to isolate design impact
- Converting metric improvements into clear dollar values
- Presenting results in executive-friendly formats

## 🏗️ Architecture

### System Overview
```
┌─────────────────────────────────────────────────────────────┐
│                        AWS Cloud                            │
│                                                             │
│  Frontend (React) ←→ API Gateway ←→ Lambda Functions        │
│                                           ↓                 │
│                                    DynamoDB Tables          │
│                                           ↓                 │
│                                  DynamoDB Streams           │
│                                           ↓                 │
│                              Analysis Processor ←→ Claude   │
└─────────────────────────────────────────────────────────────┘
```

### Key Components
- **Frontend**: React with TanStack Router and CSS Modules
- **API**: Node.js Express on AWS Lambda with serverless-http
- **Data Processing**: Event-driven architecture using DynamoDB Streams
- **AI Integration**: Claude API for intelligent experiment simulation
- **Statistical Engine**: DiD analysis with proper mathematical rigor
- **Infrastructure**: AWS CDK for repeatable deployments

## 📊 Features

### Experiment Management
- **Template-based Creation**: Pre-configured experiment types (Button Color, Checkout Flow, etc.)
- **Metric Selection**: Choose from conversion rate, revenue per user, engagement metrics
- **Automatic Processing**: Event-driven pipeline generates results and analysis

### Statistical Analysis
- **DiD Methodology**: Isolates treatment effects from external factors
- **Confidence Intervals**: Statistical significance testing
- **Economic Translation**: Converts metric improvements to dollar impact

### Data Visualization
- **Treatment vs Control**: Time-series comparisons
- **Economic Breakdown**: Clear ROI calculations by metric
- **Executive Reporting**: Professional presentation format

### Metric Value Management
- **Configurable Rates**: Set dollar value per unit for each metric
- **Historical Tracking**: Maintain consistency across experiments
- **Impact Calculation**: Automatic economic impact computation

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- AWS CLI configured
- AWS CDK installed globally

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd rallyuxr-application

# Install dependencies
npm install

# Build all packages
npx nx run-many -t build
```

### Deployment
```bash
# Deploy infrastructure
npx nx run infrastructure:deploy

# The deployment will output the frontend URL and API endpoint
```

### Local Development
```bash
# Start frontend development server
npx nx serve frontend

# Run API locally (requires deployed infrastructure for DynamoDB)
npx nx serve api-handler
```

## 📁 Project Structure

```
packages/
├── frontend/                    # React application
│   ├── src/pages/              # Main application pages
│   ├── src/components/         # Reusable UI components
│   └── src/services/           # API client
├── api-handler/                # Main API Lambda
│   ├── src/handlers/           # Route handlers
│   └── src/services/           # Business logic
├── results-generator/          # Experiment simulation
│   ├── src/generators/         # Data generation logic
│   └── src/services/           # Claude API integration
├── analysis-processor/         # Statistical analysis
│   ├── src/analysis/           # DiD calculations
│   └── src/utils/              # Mathematical utilities
├── shared/                     # Common types and schemas
│   ├── src/types/              # TypeScript interfaces
│   └── src/schemas/            # Zod validation schemas
└── infrastructure/             # AWS CDK deployment
    └── src/stacks/             # Infrastructure definitions
```

## 🔧 Configuration

### Environment Variables
The application uses environment variables for configuration:

- `CLAUDE_API_KEY`: API key for Claude integration
- `AWS_REGION`: AWS region for deployment
- `DYNAMODB_TABLE_PREFIX`: Prefix for DynamoDB table names

### Metric Values
Configure economic values through the Settings page:
- **Conversion Rate**: Dollar value per percentage point increase
- **Revenue Per User**: Direct dollar impact multiplier
- **Engagement Time**: Value per additional second of engagement

## 📈 Usage Workflow

### 1. Create Experiment
1. Navigate to "Create Experiment"
2. Select from templates or create custom experiment
3. Choose relevant metrics to track
4. Submit for automatic processing

### 2. View Results
1. Access experiment from dashboard
2. Review DiD analysis results
3. Examine economic impact breakdown
4. Export data for presentations

### 3. Manage Metrics
1. Go to Settings page
2. Update dollar values per metric unit
3. Changes apply to future experiments

## 🧪 Demo Data

The platform generates realistic experiment data for demonstration:
- **Time-series Data**: Believable treatment vs control patterns
- **Statistical Variation**: Natural fluctuations in metrics
- **Economic Impact**: Meaningful dollar value calculations
- **Multiple Scenarios**: Various experiment types and outcomes

## 🔍 Technical Details

### DiD Analysis
The statistical engine implements proper Differences-in-Differences methodology:
- Pre/post treatment period comparison
- Treatment/control group analysis
- Parallel trends assumption validation
- Statistical significance testing

### Event-Driven Processing
- DynamoDB Streams trigger analysis automatically
- Async Lambda invocation prevents API timeouts
- Idempotent operations ensure reliability

### AI Integration
- Claude API enhances experiment simulation
- Generates realistic user behavior patterns
- Provides intelligent insights for analysis

## 🛠️ Development

### Available Commands
```bash
# Build all packages
npx nx run-many -t build

# Run tests
npx nx run-many -t test

# Lint code
npx nx run-many -t lint

# Deploy infrastructure
npx nx run infrastructure:deploy

# Clean build artifacts
npx nx reset
```

### Adding New Features
1. Update shared types in `packages/shared/src/types/`
2. Add API endpoints in `packages/api-handler/src/handlers/`
3. Implement frontend components in `packages/frontend/src/`
4. Update infrastructure as needed in `packages/infrastructure/`

## 📋 API Endpoints

- `POST /experiments` - Create new experiment
- `GET /experiments` - List all experiments
- `GET /experiments/{id}` - Get experiment details
- `GET /experiments/{id}/results` - Get analysis results
- `GET /metric-values` - Get metric valuations
- `PUT /metric-values/{id}` - Update metric value
- `GET /health` - Health check

## 🎨 Design System

The application follows Dropbox Design principles:
- **Flat Design**: No 3D effects or gradients
- **Thick Borders**: Bold, black borders for definition
- **Vibrant Colors**: Bold and pastel color palette
- **Clean Typography**: Clear, readable fonts
- **Professional Aesthetics**: Executive presentation ready

## 📝 License

This project is a demonstration application showcasing technical capabilities and architectural patterns for economic impact monitoring of UX experiments.

## 🤝 Contributing

This is a demonstration project. For questions or discussions about the implementation, please reach out directly.

---

**Built with modern cloud-native architecture to demonstrate rapid delivery of production-quality solutions.**