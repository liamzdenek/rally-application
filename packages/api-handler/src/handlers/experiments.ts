import { Request, Response } from 'express';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { dynamodbService } from '../services/dynamodb.js';
import { validateRequestBody, validatePathParam } from '../utils/validation.js';
import { successResponse, errorResponse, notFoundResponse, internalErrorResponse } from '../utils/response.js';
import { CreateExperimentSchema, ExperimentDefinition } from '@rallyuxr/shared';
import { v4 as uuidv4 } from 'uuid';

const lambda = new LambdaClient({ region: process.env.AWS_REGION || 'us-west-2' });
const RESULTS_GENERATOR_FUNCTION = process.env.RESULTS_GENERATOR_FUNCTION_NAME;

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
    
    // Asynchronously invoke results-generator Lambda
    if (!RESULTS_GENERATOR_FUNCTION) {
      throw new Error('RESULTS_GENERATOR_FUNCTION_NAME environment variable not configured');
    }
    
    try {
      console.log('Invoking results generator for experiment:', createdExperiment.id);
      const invokeCommand = new InvokeCommand({
        FunctionName: RESULTS_GENERATOR_FUNCTION,
        InvocationType: 'Event', // Async invocation
        Payload: JSON.stringify({
          experimentId: createdExperiment.id,
          experiment: createdExperiment
        })
      });
      
      await lambda.send(invokeCommand);
      console.log('Results generator invoked successfully');
    } catch (error) {
      console.error('Failed to invoke results generator:', error);
      throw new Error(`Failed to trigger results generation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
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
    
    // Check if analysis exists
    const analysis = await dynamodbService.getLatestExperimentAnalysis(validation.data);
    
    const responseData = {
      experiment,
      hasResults: !!results,
      hasAnalysis: !!analysis,
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

    // Fetch analysis data
    const analysis = await dynamodbService.getLatestExperimentAnalysis(validation.data);
    
    const responseData = {
      experiment,
      results,
      analysis, // Now contains real ExperimentAnalysis data or null
    };

    const response = successResponse(responseData);
    res.status(response.statusCode).set(response.headers).send(response.body);
  } catch (error) {
    console.error('Error getting experiment results:', error);
    const response = internalErrorResponse('Failed to get experiment results');
    res.status(response.statusCode).set(response.headers).send(response.body);
  }
}