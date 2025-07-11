import { Request, Response } from 'express';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { successResponse, errorResponse } from '../utils/response.js';

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
      await dynamoClient.send({ name: 'ListTables', input: {} } as any);
      checks.dependencies.dynamodb = 'healthy';
      console.log('DynamoDB health check passed');
    } catch (error) {
      console.log('DynamoDB health check failed:', error);
      checks.dependencies.dynamodb = 'unhealthy';
      checks.status = 'degraded';
    }

    const response = successResponse(checks);
    res.status(response.statusCode).set(response.headers).send(response.body);
  } catch (error) {
    console.error('Health check error:', error);
    const response = errorResponse('HEALTH_CHECK_FAILED', 'Health check failed', 500);
    res.status(response.statusCode).set(response.headers).send(response.body);
  }
}