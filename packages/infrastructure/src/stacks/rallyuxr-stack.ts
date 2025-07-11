import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as eventsources from 'aws-cdk-lib/aws-lambda-event-sources';
import { Construct } from 'constructs';
import * as path from 'path';
import * as fs from 'fs';

// Find the git root directory
function findGitRoot(startPath: string): string {
  let currentPath = startPath;
  while (currentPath !== '/') {
    if (fs.existsSync(path.join(currentPath, '.git'))) {
      return currentPath;
    }
    currentPath = path.dirname(currentPath);
  }
  throw new Error('Git root directory not found');
}

// Validate that a path exists and is not empty
function validatePath(pathToCheck: string, description: string): void {
  if (!fs.existsSync(pathToCheck)) {
    throw new Error(`${description} path does not exist: ${pathToCheck}`);
  }
  
  const stats = fs.statSync(pathToCheck);
  if (stats.isDirectory() && fs.readdirSync(pathToCheck).length === 0) {
    throw new Error(`${description} directory is empty: ${pathToCheck}`);
  }
}

const GIT_ROOT = findGitRoot(__dirname);
const API_HANDLER_PATH = path.join(GIT_ROOT, 'dist/packages/api-handler');
const RESULTS_GENERATOR_PATH = path.join(GIT_ROOT, 'dist/packages/results-generator');
const ANALYSIS_PROCESSOR_PATH = path.join(GIT_ROOT, 'dist/packages/analysis-processor');
const FRONTEND_PATH = path.join(GIT_ROOT, 'dist/packages/frontend');

export class RallyUXRStack extends cdk.Stack {
  public readonly apiUrl: string;
  public readonly frontendUrl: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ============================================================================
    // DYNAMODB TABLES
    // ============================================================================

    // Experiment Definition Table
    const experimentDefinitionTable = new dynamodb.Table(this, 'ExperimentDefinitionTable', {
      tableName: 'RallyUXR-ExperimentDefinition',
      partitionKey: { name: 'experimentId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development
      pointInTimeRecovery: true,
      timeToLiveAttribute: 'ttl'
    });

    // Experiment Results Table with Stream
    const experimentResultsTable = new dynamodb.Table(this, 'ExperimentResultsTable', {
      tableName: 'RallyUXR-ExperimentResults',
      partitionKey: { name: 'experimentId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development
      pointInTimeRecovery: true,
      timeToLiveAttribute: 'ttl',
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES // Enable stream for analysis trigger
    });

    // Experiment Analysis Table
    const experimentAnalysisTable = new dynamodb.Table(this, 'ExperimentAnalysisTable', {
      tableName: 'RallyUXR-ExperimentAnalysis',
      partitionKey: { name: 'experimentId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'analysisId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development
      pointInTimeRecovery: true,
      timeToLiveAttribute: 'ttl'
    });

    // Metric Values Table
    const metricValuesTable = new dynamodb.Table(this, 'MetricValuesTable', {
      tableName: 'RallyUXR-MetricValues',
      partitionKey: { name: 'experimentId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'metricId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development
      pointInTimeRecovery: true,
      timeToLiveAttribute: 'ttl'
    });

    // Add Global Secondary Indexes
    experimentResultsTable.addGlobalSecondaryIndex({
      indexName: 'UserIdIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING }
    });

    experimentAnalysisTable.addGlobalSecondaryIndex({
      indexName: 'StatusIndex',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING }
    });

    metricValuesTable.addGlobalSecondaryIndex({
      indexName: 'MetricTypeIndex',
      partitionKey: { name: 'metricType', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING }
    });

    // ============================================================================
    // LAMBDA FUNCTIONS
    // ============================================================================

    // Common environment variables for all lambdas
    const commonEnvironment = {
      EXPERIMENT_DEFINITION_TABLE: experimentDefinitionTable.tableName,
      EXPERIMENT_RESULTS_TABLE: experimentResultsTable.tableName,
      EXPERIMENT_ANALYSIS_TABLE: experimentAnalysisTable.tableName,
      METRIC_VALUES_TABLE: metricValuesTable.tableName,
      NODE_ENV: 'production'
    };

    // API Handler Lambda
    const apiHandlerFunction = new lambda.Function(this, 'ApiHandlerFunction', {
      functionName: 'RallyUXR-ApiHandler',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'main.handler',
      code: lambda.Code.fromAsset(API_HANDLER_PATH),
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024,
      environment: commonEnvironment
    });

    // Results Generator Lambda
    const resultsGeneratorFunction = new lambda.Function(this, 'ResultsGeneratorFunction', {
      functionName: 'RallyUXR-ResultsGenerator',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'main.handler',
      code: lambda.Code.fromAsset(RESULTS_GENERATOR_PATH),
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024,
      environment: commonEnvironment
    });

    // Analysis Processor Lambda (triggered by DynamoDB stream)
    const analysisProcessorFunction = new lambda.Function(this, 'AnalysisProcessorFunction', {
      functionName: 'RallyUXR-AnalysisProcessor',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'main.handler',
      code: lambda.Code.fromAsset(ANALYSIS_PROCESSOR_PATH),
      timeout: cdk.Duration.seconds(300), // 5 minutes for analysis processing
      memorySize: 2048,
      environment: commonEnvironment
    });

    // ============================================================================
    // IAM PERMISSIONS
    // ============================================================================

    // Grant DynamoDB permissions to all lambdas
    experimentDefinitionTable.grantReadWriteData(apiHandlerFunction);
    experimentResultsTable.grantReadWriteData(apiHandlerFunction);
    experimentAnalysisTable.grantReadWriteData(apiHandlerFunction);
    metricValuesTable.grantReadWriteData(apiHandlerFunction);

    experimentDefinitionTable.grantReadData(resultsGeneratorFunction);
    experimentResultsTable.grantReadWriteData(resultsGeneratorFunction);
    metricValuesTable.grantReadWriteData(resultsGeneratorFunction);

    experimentDefinitionTable.grantReadData(analysisProcessorFunction);
    experimentResultsTable.grantReadData(analysisProcessorFunction);
    experimentAnalysisTable.grantReadWriteData(analysisProcessorFunction);
    metricValuesTable.grantReadWriteData(analysisProcessorFunction);

    // Grant stream read permissions to analysis processor
    experimentResultsTable.grantStreamRead(analysisProcessorFunction);

    // ============================================================================
    // DYNAMODB STREAM EVENT SOURCE
    // ============================================================================

    // Add DynamoDB stream as event source for analysis processor
    analysisProcessorFunction.addEventSource(new eventsources.DynamoEventSource(experimentResultsTable, {
      startingPosition: lambda.StartingPosition.LATEST,
      batchSize: 10,
      maxBatchingWindow: cdk.Duration.seconds(5),
      retryAttempts: 3
    }));

    // ============================================================================
    // API GATEWAY
    // ============================================================================

    // Create API Gateway
    const api = new apigateway.RestApi(this, 'RallyUXRApi', {
      restApiName: 'RallyUXR API',
      description: 'RallyUXR API for experiment management and analysis',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key', 'X-Amz-Security-Token']
      }
    });

    // API Gateway Lambda integration
    const apiIntegration = new apigateway.LambdaIntegration(apiHandlerFunction);

    // Add proxy resource to handle all API routes
    const proxyResource = api.root.addProxy({
      defaultIntegration: apiIntegration,
      anyMethod: true
    });

    // Health check endpoint
    const healthResource = api.root.addResource('health');
    healthResource.addMethod('GET', apiIntegration);

    // ============================================================================
    // S3 BUCKET FOR FRONTEND
    // ============================================================================

    // S3 bucket for frontend static files
    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: `rallyuxr-frontend-${this.account}-${this.region}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development
      autoDeleteObjects: true // For development
    });

    // ============================================================================
    // CLOUDFRONT DISTRIBUTION
    // ============================================================================

    // Origin Access Identity for S3
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'FrontendOAI', {
      comment: 'RallyUXR Frontend OAI'
    });

    // Grant CloudFront access to S3 bucket
    frontendBucket.grantRead(originAccessIdentity);

    // CloudFront distribution
    const distribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: new origins.S3Origin(frontendBucket, {
          originAccessIdentity: originAccessIdentity
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED
      },
      additionalBehaviors: {
        '/api/*': {
          origin: new origins.RestApiOrigin(api),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED
        },
        '/health': {
          origin: new origins.RestApiOrigin(api),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED
        }
      },
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html' // SPA routing
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html' // SPA routing
        }
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100
    });

    // Deploy frontend to S3 (only if frontend path exists)
    if (fs.existsSync(FRONTEND_PATH)) {
      new s3deploy.BucketDeployment(this, 'DeployFrontend', {
        sources: [s3deploy.Source.asset(FRONTEND_PATH)],
        destinationBucket: frontendBucket,
        distribution,
        distributionPaths: ['/*']
      });
    }

    // ============================================================================
    // OUTPUTS
    // ============================================================================

    this.apiUrl = api.url;
    this.frontendUrl = `https://${distribution.distributionDomainName}`;

    // CloudFormation outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.apiUrl,
      description: 'RallyUXR API Gateway URL',
      exportName: 'RallyUXR-ApiUrl'
    });

    new cdk.CfnOutput(this, 'FrontendUrl', {
      value: this.frontendUrl,
      description: 'RallyUXR Frontend CloudFront URL',
      exportName: 'RallyUXR-FrontendUrl'
    });

    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: frontendBucket.bucketName,
      description: 'RallyUXR Frontend S3 Bucket Name',
      exportName: 'RallyUXR-FrontendBucketName'
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: distribution.distributionId,
      description: 'RallyUXR CloudFront Distribution ID',
      exportName: 'RallyUXR-CloudFrontDistributionId'
    });

    // Table names for reference
    new cdk.CfnOutput(this, 'ExperimentDefinitionTableName', {
      value: experimentDefinitionTable.tableName,
      exportName: 'RallyUXR-ExperimentDefinitionTableName'
    });

    new cdk.CfnOutput(this, 'ExperimentResultsTableName', {
      value: experimentResultsTable.tableName,
      exportName: 'RallyUXR-ExperimentResultsTableName'
    });

    new cdk.CfnOutput(this, 'ExperimentAnalysisTableName', {
      value: experimentAnalysisTable.tableName,
      exportName: 'RallyUXR-ExperimentAnalysisTableName'
    });

    new cdk.CfnOutput(this, 'MetricValuesTableName', {
      value: metricValuesTable.tableName,
      exportName: 'RallyUXR-MetricValuesTableName'
    });

    // Lambda function names
    new cdk.CfnOutput(this, 'ApiHandlerFunctionName', {
      value: apiHandlerFunction.functionName,
      description: 'API Handler Lambda Function Name'
    });

    new cdk.CfnOutput(this, 'ResultsGeneratorFunctionName', {
      value: resultsGeneratorFunction.functionName,
      description: 'Results Generator Lambda Function Name'
    });

    new cdk.CfnOutput(this, 'AnalysisProcessorFunctionName', {
      value: analysisProcessorFunction.functionName,
      description: 'Analysis Processor Lambda Function Name'
    });
  }
}