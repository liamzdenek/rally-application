import { Request, Response } from 'express';
import { dynamodbService } from '../services/dynamodb.js';
import { validatePathParam } from '../utils/validation.js';
import { successResponse, errorResponse, notFoundResponse, internalErrorResponse } from '../utils/response.js';

export async function getExperimentAnalysis(req: Request, res: Response) {
  console.log('Getting experiment analysis');
  
  try {
    const validation = validatePathParam(req.params.experimentId, 'experimentId');
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

    // Get the latest analysis for the experiment
    const analysis = await dynamodbService.getLatestExperimentAnalysis(validation.data);
    if (!analysis) {
      const response = errorResponse(
        'ANALYSIS_NOT_FOUND',
        'Analysis not yet available for this experiment',
        404
      );
      return res.status(response.statusCode).set(response.headers).send(response.body);
    }

    const responseData = {
      experiment,
      analysis,
    };

    const response = successResponse(responseData);
    res.status(response.statusCode).set(response.headers).send(response.body);
  } catch (error) {
    console.error('Error getting experiment analysis:', error);
    const response = internalErrorResponse('Failed to get experiment analysis');
    res.status(response.statusCode).set(response.headers).send(response.body);
  }
}

export async function listExperimentAnalyses(req: Request, res: Response) {
  console.log('Listing experiment analyses');
  
  try {
    const validation = validatePathParam(req.params.experimentId, 'experimentId');
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

    // Get all analyses for the experiment
    const analyses = await dynamodbService.listExperimentAnalyses(validation.data);

    const responseData = {
      experiment,
      analyses,
      count: analyses.length,
    };

    const response = successResponse(responseData);
    res.status(response.statusCode).set(response.headers).send(response.body);
  } catch (error) {
    console.error('Error listing experiment analyses:', error);
    const response = internalErrorResponse('Failed to list experiment analyses');
    res.status(response.statusCode).set(response.headers).send(response.body);
  }
}

export async function getSpecificAnalysis(req: Request, res: Response) {
  console.log('Getting specific analysis');
  
  try {
    const experimentIdValidation = validatePathParam(req.params.experimentId, 'experimentId');
    if (!experimentIdValidation.success) {
      return res.status(experimentIdValidation.response.statusCode)
        .set(experimentIdValidation.response.headers)
        .send(experimentIdValidation.response.body);
    }

    const analysisIdValidation = validatePathParam(req.params.analysisId, 'analysisId');
    if (!analysisIdValidation.success) {
      return res.status(analysisIdValidation.response.statusCode)
        .set(analysisIdValidation.response.headers)
        .send(analysisIdValidation.response.body);
    }

    // Check if experiment exists first
    const experiment = await dynamodbService.getExperiment(experimentIdValidation.data);
    if (!experiment) {
      const response = notFoundResponse('Experiment');
      return res.status(response.statusCode).set(response.headers).send(response.body);
    }

    // Get the specific analysis
    const analysis = await dynamodbService.getExperimentAnalysis(
      experimentIdValidation.data, 
      analysisIdValidation.data
    );
    if (!analysis) {
      const response = notFoundResponse('Analysis');
      return res.status(response.statusCode).set(response.headers).send(response.body);
    }

    const responseData = {
      experiment,
      analysis,
    };

    const response = successResponse(responseData);
    res.status(response.statusCode).set(response.headers).send(response.body);
  } catch (error) {
    console.error('Error getting specific analysis:', error);
    const response = internalErrorResponse('Failed to get analysis');
    res.status(response.statusCode).set(response.headers).send(response.body);
  }
}