import { Request, Response } from 'express';
import { dynamodbService } from '../services/dynamodb.js';
import { validateRequestBody, validatePathParam } from '../utils/validation.js';
import { successResponse, errorResponse, notFoundResponse, internalErrorResponse } from '../utils/response.js';
import { MetricValueSchema, MetricValue } from '@rallyuxr/shared';
import { z } from 'zod';

// Schema for partial updates - exclude metricId since it's in the path
const updateMetricSchema = MetricValueSchema.partial().omit({ metricId: true });

// Schema for creating new metrics
const createMetricSchema = MetricValueSchema.omit({ 
  lastUpdated: true, 
  version: true 
});

export async function getAllMetricConfigurations(req: Request, res: Response) {
  console.log('Getting all metric configurations');
  
  try {
    const metrics = await dynamodbService.getAllMetricConfigurations();
    
    // Group metrics by category for the response
    const categories = [...new Set(metrics.map(m => m.category))];
    
    const responseData = {
      metrics,
      categories,
      totalMetrics: metrics.length,
    };
    
    const response = successResponse(responseData);
    res.status(response.statusCode).set(response.headers).send(response.body);
  } catch (error) {
    console.error('Error getting metric configurations:', error);
    const response = internalErrorResponse('Failed to get metric configurations');
    res.status(response.statusCode).set(response.headers).send(response.body);
  }
}

export async function updateMetricValue(req: Request, res: Response) {
  console.log('Updating metric value');
  
  try {
    const paramValidation = validatePathParam(req.params.id, 'id');
    if (!paramValidation.success) {
      return res.status(paramValidation.response.statusCode)
        .set(paramValidation.response.headers)
        .send(paramValidation.response.body);
    }

    const bodyValidation = validateRequestBody(updateMetricSchema, req);
    if (!bodyValidation.success) {
      return res.status(bodyValidation.response.statusCode)
        .set(bodyValidation.response.headers)
        .send(bodyValidation.response.body);
    }

    // Get current metric to track previous value
    const currentMetric = await dynamodbService.getAllMetricConfigurations();
    const existing = currentMetric.find(m => m.metricId === paramValidation.data);
    const previousValue = existing?.dollarsPerUnit || 0;

    // Add versioning and timestamp to updates
    const updates = {
      ...bodyValidation.data,
      lastUpdated: new Date().toISOString(),
      version: (existing?.version || 0) + 1,
    };

    const updatedMetric = await dynamodbService.updateMetricValue(
      paramValidation.data,
      updates
    );

    if (!updatedMetric) {
      const response = notFoundResponse('Metric configuration');
      return res.status(response.statusCode).set(response.headers).send(response.body);
    }

    const responseData = {
      metric: updatedMetric,
      previousValue,
      impactedExperiments: 0, // This would be calculated from active experiments
    };

    const response = successResponse(responseData, 200);
    res.status(response.statusCode).set(response.headers).send(response.body);
  } catch (error) {
    console.error('Error updating metric value:', error);
    const response = internalErrorResponse('Failed to update metric value');
    res.status(response.statusCode).set(response.headers).send(response.body);
  }
}

export async function createMetricConfiguration(req: Request, res: Response) {
  console.log('Creating new metric configuration');
  
  try {
    const validation = validateRequestBody(createMetricSchema, req);
    if (!validation.success) {
      return res.status(validation.response.statusCode)
        .set(validation.response.headers)
        .send(validation.response.body);
    }

    // Add timestamps and version to the metric
    const now = new Date().toISOString();
    const metric: MetricValue = {
      ...validation.data,
      lastUpdated: now,
      version: 1,
    };

    const createdMetric = await dynamodbService.createMetricConfiguration(metric);
    const response = successResponse(createdMetric, 201);
    
    res.status(response.statusCode).set(response.headers).send(response.body);
  } catch (error) {
    console.error('Error creating metric configuration:', error);
    const response = internalErrorResponse('Failed to create metric configuration');
    res.status(response.statusCode).set(response.headers).send(response.body);
  }
}