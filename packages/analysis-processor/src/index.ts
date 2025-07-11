/**
 * Main Lambda handler for processing DynamoDB stream events
 * Performs Differences-in-Differences analysis on experiment results
 */

import { DynamoDBStreamEvent, DynamoDBRecord, Context } from 'aws-lambda';
import { AttributeValue } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { ExperimentResult } from '../../shared/src/types';
import { performDidAnalysis } from './analysis/did';
import { calculateEconomicImpact } from './analysis/economics';
import { generateComprehensiveInsights } from './analysis/insights';
import { dynamoService } from './services/dynamodb';

/**
 * Lambda handler for DynamoDB stream processing
 */
export async function handler(event: DynamoDBStreamEvent, context: Context) {
  console.log(`Processing DynamoDB stream event with ${event.Records.length} records`);
  console.log('Lambda context:', {
    requestId: context.awsRequestId,
    functionName: context.functionName,
    memoryLimit: context.memoryLimitInMB,
    timeRemaining: context.getRemainingTimeInMillis()
  });

  const results = [];

  for (const record of event.Records) {
    try {
      const result = await processRecord(record);
      if (result) {
        results.push(result);
      }
    } catch (error) {
      console.error('Error processing record:', error);
      // Continue processing other records even if one fails
      results.push({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        recordId: record.dynamodb?.SequenceNumber
      });
    }
  }

  console.log(`Processed ${event.Records.length} records: ${results.filter(r => r.success).length} successful, ${results.filter(r => !r.success).length} failed`);
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      processed: event.Records.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    })
  };
}

/**
 * Process individual DynamoDB stream record
 */
async function processRecord(record: DynamoDBRecord): Promise<{ success: boolean; experimentId?: string; analysisId?: string; error?: string; recordId?: string }> {
  console.log(`Processing record: ${record.eventName} on ${record.dynamodb?.SequenceNumber}`);

  // Only process INSERT and MODIFY events
  if (record.eventName !== 'INSERT' && record.eventName !== 'MODIFY') {
    console.log(`Skipping ${record.eventName} event`);
    return { success: true, recordId: record.dynamodb?.SequenceNumber };
  }

  // Extract the new image (current state of the item)
  const newImage = record.dynamodb?.NewImage;
  if (!newImage) {
    console.log('No new image in record, skipping');
    return { success: true, recordId: record.dynamodb?.SequenceNumber };
  }

  try {
    // Unmarshall DynamoDB attribute values to regular JavaScript object
    const experimentResult = unmarshall(newImage as Record<string, AttributeValue>) as ExperimentResult;
    
    console.log(`Processing experiment result: ${experimentResult.experimentId}`);
    
    // Validate that this is an experiment result record
    if (!experimentResult.experimentId || !experimentResult.metrics) {
      console.log('Record is not a valid experiment result, skipping');
      return { success: true, recordId: record.dynamodb?.SequenceNumber };
    }

    // Check if we've already processed this experiment result
    const existingAnalysis = await dynamoService.analysisExists(
      experimentResult.experimentId, 
      experimentResult.generatedAt
    );

    if (existingAnalysis) {
      console.log(`Analysis already exists for experiment ${experimentResult.experimentId}, skipping`);
      return { success: true, experimentId: experimentResult.experimentId, recordId: record.dynamodb?.SequenceNumber };
    }

    // Perform the analysis
    const analysisId = await performCompleteAnalysis(experimentResult);
    
    return { 
      success: true, 
      experimentId: experimentResult.experimentId, 
      analysisId,
      recordId: record.dynamodb?.SequenceNumber 
    };

  } catch (error) {
    console.error('Error processing experiment result:', error);
    throw error;
  }
}

/**
 * Perform complete DiD analysis and save results
 */
async function performCompleteAnalysis(experimentResult: ExperimentResult): Promise<string> {
  console.log(`Starting complete analysis for experiment: ${experimentResult.experimentId}`);
  
  try {
    // Step 1: Get metric values for economic calculations
    console.log('Fetching metric values for economic impact calculation');
    const metricValues = await dynamoService.getMetricValues();
    
    if (Object.keys(metricValues).length === 0) {
      console.warn('No metric values found - economic impact will be limited');
    }

    // Step 2: Perform DiD analysis
    console.log('Performing Differences-in-Differences analysis');
    const didResults = performDidAnalysis(experimentResult, {
      confidenceLevel: 95,
      minimumSampleSize: 10,
      alpha: 0.05
    });

    if (Object.keys(didResults).length === 0) {
      throw new Error('No valid metrics found for analysis');
    }

    // Step 3: Calculate economic impact
    console.log('Calculating economic impact');
    const economicImpact = calculateEconomicImpact(
      didResults,
      metricValues,
      experimentResult.experimentPeriod.totalHours / 24, // Convert hours to days
      {
        confidenceLevel: 95,
        includeOnlySignificant: false
      }
    );

    // Step 4: Generate insights and recommendations
    console.log('Generating comprehensive insights');
    const insights = generateComprehensiveInsights(
      didResults,
      economicImpact,
      {
        startDate: experimentResult.experimentPeriod.startDate,
        endDate: experimentResult.experimentPeriod.endDate,
        durationDays: Math.ceil(experimentResult.experimentPeriod.totalHours / 24)
      },
      metricValues
    );

    // Step 5: Create metric values snapshot for historical accuracy
    const metricValuesSnapshot: { [metricId: string]: { dollarsPerUnit: number; description: string; unit: string } } = {};
    for (const [metricId, metricValue] of Object.entries(metricValues)) {
      metricValuesSnapshot[metricId] = {
        dollarsPerUnit: metricValue.dollarsPerUnit,
        description: metricValue.description,
        unit: metricValue.unit
      };
    }

    // Step 6: Save analysis results
    console.log('Saving analysis results to DynamoDB');
    const analysisId = await dynamoService.saveExperimentAnalysis(
      experimentResult.experimentId,
      didResults,
      economicImpact,
      metricValuesSnapshot,
      {
        startDate: experimentResult.experimentPeriod.startDate,
        endDate: experimentResult.experimentPeriod.endDate,
        durationDays: Math.ceil(experimentResult.experimentPeriod.totalHours / 24)
      },
      '1.0.0'
    );

    console.log(`Successfully completed analysis for experiment ${experimentResult.experimentId}`);
    console.log(`Analysis summary: ${insights.summary}`);
    console.log(`Key findings: ${insights.keyFindings.length}, Recommendations: ${insights.recommendations.length}`);
    console.log(`Economic impact: $${economicImpact.totalImpact.toFixed(2)} daily, $${economicImpact.annualizedImpact.toLocaleString()} annually`);

    return analysisId;

  } catch (error) {
    console.error(`Failed to complete analysis for experiment ${experimentResult.experimentId}:`, error);
    
    // Try to save error status if we have enough information
    try {
      const errorAnalysisId = `error-${Date.now()}`;
      await dynamoService.updateAnalysisStatus(
        experimentResult.experimentId,
        errorAnalysisId,
        'failed',
        error instanceof Error ? error.message : 'Unknown analysis error'
      );
    } catch (statusError) {
      console.error('Failed to save error status:', statusError);
    }
    
    throw error;
  }
}

/**
 * Health check endpoint for Lambda
 */
export async function healthCheck(): Promise<{ statusCode: number; body: string }> {
  console.log('Performing health check');
  
  try {
    // Check DynamoDB connectivity
    const dbHealth = await dynamoService.healthCheck();
    
    if (!dbHealth.healthy) {
      return {
        statusCode: 503,
        body: JSON.stringify({
          status: 'unhealthy',
          error: dbHealth.error,
          timestamp: new Date().toISOString()
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 'healthy',
        message: 'Analysis processor is running correctly',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      })
    };

  } catch (error) {
    console.error('Health check failed:', error);
    return {
      statusCode: 503,
      body: JSON.stringify({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown health check error',
        timestamp: new Date().toISOString()
      })
    };
  }
}

// Export for testing
export { processRecord, performCompleteAnalysis };