import { Request, Response } from 'express';
import { dynamodbService } from '../services/dynamodb.js';
import { validateRequestBody, validatePathParam } from '../utils/validation.js';
import { successResponse, errorResponse, notFoundResponse, internalErrorResponse } from '../utils/response.js';
import { CreateExperimentSchema, ExperimentDefinition } from '@rallyuxr/shared';
import { v4 as uuidv4 } from 'uuid';

export async function createExperiment(req: Request, res: Response) {
  console.log('Creating new experiment');
  
  try {
    const validation = validateRequestBody(CreateExperimentSchema, req);
    if (!validation.success) {
      return res.status(validation.response.statusCode)
        .set(validation.response.headers)
        .send(validation.response.body);
    }

    // Create full experiment object with generated fields
    const now = new Date().toISOString();
    const experiment: ExperimentDefinition = {
      id: uuidv4(),
      ...validation.data,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };

    const createdExperiment = await dynamodbService.createExperiment(experiment);
    
    // Return response matching API contract
    const responseData = {
      experimentId: createdExperiment.id,
      status: createdExperiment.status,
      message: 'Experiment created successfully',
      estimatedCompletionTime: new Date(Date.now() + (2 * 60 * 60 * 1000)).toISOString(), // 2 hours from now
    };
    
    const response = successResponse(responseData, 201);
    res.status(response.statusCode).set(response.headers).send(response.body);
  } catch (error) {
    console.error('Error creating experiment:', error);
    const response = internalErrorResponse('Failed to create experiment');
    res.status(response.statusCode).set(response.headers).send(response.body);
  }
}

export async function listExperiments(req: Request, res: Response) {
  console.log('Listing all experiments');
  
  try {
    const experiments = await dynamodbService.listExperiments();
    
    // Transform to summary format as per API contract
    const summary = experiments.map(exp => ({
      id: exp.id,
      name: exp.name,
      status: exp.status,
      type: exp.expectedOutcome, // Using expectedOutcome as type for now
      createdAt: exp.createdAt,
      participantCount: 0, // This would come from actual data in a real system
    }));
    
    // Calculate summary statistics
    const completedExperiments = experiments.filter(exp => exp.status === 'complete').length;
    const totalEconomicImpact = 0; // This would be calculated from analysis data
    
    const responseData = {
      experiments: summary,
      pagination: {
        total: experiments.length,
        limit: 50, // Default limit
        offset: 0,
        hasMore: false,
      },
      summary: {
        totalExperiments: experiments.length,
        completedExperiments,
        totalEconomicImpact,
      },
    };
    
    const response = successResponse(responseData);
    res.status(response.statusCode).set(response.headers).send(response.body);
  } catch (error) {
    console.error('Error listing experiments:', error);
    const response = internalErrorResponse('Failed to list experiments');
    res.status(response.statusCode).set(response.headers).send(response.body);
  }
}

export async function getExperiment(req: Request, res: Response) {
  console.log('Getting experiment details');
  
  try {
    const validation = validatePathParam(req.params.id, 'id');
    if (!validation.success) {
      return res.status(validation.response.statusCode)
        .set(validation.response.headers)
        .send(validation.response.body);
    }

    const experiment = await dynamodbService.getExperiment(validation.data);
    if (!experiment) {
      const response = notFoundResponse('Experiment');
      return res.status(response.statusCode).set(response.headers).send(response.body);
    }

    // Check if results exist
    const results = await dynamodbService.getExperimentResults(validation.data);
    
    const responseData = {
      experiment,
      hasResults: !!results,
      hasAnalysis: false, // This would check for analysis data
      participantCount: 0, // This would come from actual participant data
    };

    const response = successResponse(responseData);
    res.status(response.statusCode).set(response.headers).send(response.body);
  } catch (error) {
    console.error('Error getting experiment:', error);
    const response = internalErrorResponse('Failed to get experiment');
    res.status(response.statusCode).set(response.headers).send(response.body);
  }
}

export async function getExperimentResults(req: Request, res: Response) {
  console.log('Getting experiment results and analysis');
  
  try {
    const validation = validatePathParam(req.params.id, 'id');
    if (!validation.success) {
      return res.status(validation.response.statusCode)
        .set(validation.response.headers)
        .send(validation.response.body);
    }

    // Check if experiment exists first
    const experiment = await dynamodbService.getExperiment(validation.data);
    if (!experiment) {
      const response = notFoundResponse('Experiment');
      return res.status(response.statusCode).set(response.headers).send(response.body);
    }

    const results = await dynamodbService.getExperimentResults(validation.data);
    if (!results) {
      const response = errorResponse(
        'RESULTS_NOT_FOUND',
        'Results not yet available for this experiment',
        404
      );
      return res.status(response.statusCode).set(response.headers).send(response.body);
    }

    // In a real system, we would also fetch analysis data
    const responseData = {
      experiment,
      results,
      analysis: null, // This would contain ExperimentAnalysis data
    };

    const response = successResponse(responseData);
    res.status(response.statusCode).set(response.headers).send(response.body);
  } catch (error) {
    console.error('Error getting experiment results:', error);
    const response = internalErrorResponse('Failed to get experiment results');
    res.status(response.statusCode).set(response.headers).send(response.body);
  }
}