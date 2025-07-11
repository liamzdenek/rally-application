# Technical Context

## Technology Stack

### Frontend Technologies
- **React 18+**: Component-based UI library for building interactive interfaces
- **TanStack Router**: Type-safe client-side routing (not React Router)
- **CSS Modules**: Scoped styling without CSS frameworks like Tailwind
- **TypeScript**: Type safety and enhanced developer experience
- **Dropbox Design System**: Flat design, thick black borders, vibrant colors

### Backend Technologies
- **AWS Lambda**: Serverless compute for API handlers and processors
- **Node.js**: JavaScript runtime for Lambda functions
- **TypeScript**: Type safety across backend services
- **Zod**: Schema validation for API requests and data integrity
- **Serverless-HTTP**: Lambda-compatible HTTP handling

### Data Technologies
- **DynamoDB**: NoSQL database for all application data
- **DynamoDB Streams**: Event-driven triggers for processing
- **Single-table design**: Optimized for access patterns

### Infrastructure Technologies
- **AWS CDK**: Infrastructure as code for repeatable deployments
- **CloudFormation**: AWS native infrastructure management
- **API Gateway**: HTTP API management and routing
- **S3**: Static website hosting for frontend
- **CloudFront**: CDN for global content distribution
- **Origin Access Identity**: Secure S3 access through CloudFront

### Development Technologies
- **Nx Monorepo**: Workspace management and build orchestration
- **npm**: Package management (no yarn or pnpm)
- **Jest**: Unit testing framework
- **ESLint**: Code linting and quality
- **Prettier**: Code formatting

## Development Setup Requirements

### Environment Setup
- **Node.js 18+**: Required for all development and build processes
- **AWS CLI**: For deployment and resource management
- **AWS CDK CLI**: For infrastructure deployment
- **Git**: Version control and collaboration

### Project Structure
```
packages/
├── frontend/          # React application
├── api-handler/       # Main API Lambda function
├── results-generator/ # Results simulation Lambda
├── analysis-processor/# DiD analysis Lambda
├── shared/           # Common types and utilities
└── infrastructure/   # CDK deployment code
```

### Build Configuration
- **Single `dist/` directory**: All packages build to root dist with subfolders
- **Clean builds required**: Must clean artifacts before rebuilding
- **No external AWS SDK**: Bundle AWS SDK with Lambda functions
- **Nx targets**: All operations use `npx nx run` commands

## AWS Architecture Constraints

### Lambda Configuration
- **NodejsFunction primitive**: Use CDK NodejsFunction for all Lambdas
- **Environment variables**: Configuration passed via environment
- **No hardcoded ARNs**: Use CDK references (GetAtt/Ref)
- **Bundle everything**: No external dependencies marked as external

### DynamoDB Design
- **Single-record pattern**: ExperimentResults as single record with nested data
- **Stream triggers**: Analysis processor triggered by DynamoDB streams
- **No mocking**: Use actual AWS services for testing

### API Gateway Setup
- **REST API**: Not HTTP API for full feature support
- **CORS enabled**: All origins allowed for demo purposes
- **No authentication**: Authentication out of scope

## Development Constraints

### Code Organization
- **No cross-imports**: Frontend cannot import backend code directly
- **Shared package**: Common types and utilities in dedicated package
- **TypeScript everywhere**: No JavaScript files in packages

### Build Requirements
- **Compile outside CDK**: Don't use CDK for TypeScript compilation
- **Validate artifacts**: Always check build outputs after configuration changes
- **Clean workflow**: `clean → build → deploy → test`

### Deployment Patterns
- **Environment variables**: All configuration via environment
- **No fallbacks**: Either works or fails with logging
- **Idempotent**: Safe to redeploy multiple times

## External Dependencies

### Production Dependencies
- **AWS SDK**: For Lambda functions (bundled, not external)
- **React ecosystem**: Core React packages for frontend
- **Zod**: Schema validation across packages
- **TanStack Router**: Frontend routing

### Development Dependencies
- **Nx**: Monorepo management and build orchestration
- **TypeScript**: Compilation and type checking
- **ESLint/Prettier**: Code quality and formatting
- **AWS CDK**: Infrastructure deployment

### Excluded Technologies
- **Playwright/E2E testing**: Out of scope for demo
- **React Router**: Using TanStack Router instead
- **CSS Frameworks**: Using CSS Modules only
- **Tailwind CSS**: Explicitly avoided per requirements
- **Local development**: Deploy to AWS for testing

## Configuration Management

### Environment Variables
- **Build-time**: Frontend environment variables available at build
- **Runtime**: Lambda environment variables for ARNs and configuration
- **No secrets**: All configuration is non-sensitive for demo

### Git Configuration
- **Include .env* in .gitignore**: Prevent environment file commits
- **No legacy peer deps**: Fix dependency conflicts instead of ignoring

## Performance Considerations

### Frontend Performance
- **Static hosting**: S3 + CloudFront for fast delivery
- **Code splitting**: Automatic with React and modern bundlers
- **Asset optimization**: Standard web optimization practices

### Backend Performance
- **Lambda cold starts**: Minimize by bundling dependencies
- **DynamoDB capacity**: On-demand scaling for demo usage
- **API response times**: Async processing prevents timeout issues

### Data Processing
- **Single-record design**: Faster queries, simpler access patterns
- **Event-driven**: Processing continues in background
- **Batch operations**: Process complete datasets efficiently