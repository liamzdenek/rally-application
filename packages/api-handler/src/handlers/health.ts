import { Request, Response } from 'express';
import { DynamoDBClient, ListTablesCommand } from '@aws-sdk/client-dynamodb';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });

export async function healthCheck(req: Request, res: Response) {
  console.log('Health check requested');
  
  try {
    const checks = {
      service: 'api-handler',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      dependencies: {
        dynamodb: 'unknown',
      },
    };

    // Check DynamoDB connectivity
    try {
      const command = new ListTablesCommand({});
      await dynamoClient.send(command);
      checks.dependencies.dynamodb = 'healthy';
      console.log('DynamoDB health check passed');
    } catch (error) {
      console.log('DynamoDB health check failed:', error);
      checks.dependencies.dynamodb = 'unhealthy';
      checks.status = 'degraded';
    }

    res.status(200).json({
      data: checks,
      message: 'Health check completed'
    });
    return;
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      error: 'HEALTH_CHECK_FAILED',
      message: 'Health check failed'
    });
    return;
  }
}