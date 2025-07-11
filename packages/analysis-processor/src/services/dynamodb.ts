/**
 * DynamoDB service for experiment analysis operations
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  GetCommand, 
  PutCommand, 
  QueryCommand, 
  UpdateCommand 
} from '@aws-sdk/lib-dynamodb';
import { ExperimentResult, ExperimentAnalysis, MetricValue } from '../../../shared/src/types';
import { v4 as uuidv4 } from 'uuid';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

const docClient = DynamoDBDocumentClient.from(client);

// Environment variables for table names
const EXPERIMENT_RESULTS_TABLE = process.env.EXPERIMENT_RESULTS_TABLE!;
const EXPERIMENT_ANALYSIS_TABLE = process.env.EXPERIMENT_ANALYSIS_TABLE!;
const METRIC_VALUES_TABLE = process.env.METRIC_VALUES_TABLE!;

export class DynamoDBService {
  /**
   * Get experiment result by experiment ID
   */
  async getExperimentResult(experimentId: string): Promise<ExperimentResult | null> {
    console.log(`Fetching experiment result for experimentId: ${experimentId}`);
    
    try {
      const command = new GetCommand({
        TableName: EXPERIMENT_RESULTS_TABLE,
        Key: { experimentId }
      });

      const response = await docClient.send(command);
      
      if (!response.Item) {
        console.log(`No experiment result found for experimentId: ${experimentId}`);
        return null;
      }

      console.log(`Successfully retrieved experiment result for experimentId: ${experimentId}`);
      return response.Item as ExperimentResult;
    } catch (error) {
      console.error(`Error fetching experiment result for experimentId ${experimentId}:`, error);
      throw new Error(`Failed to fetch experiment result: ${error}`);
    }
  }

  /**
   * Get specific metric values for calculating economic impact
   */
  async getMetricValues(metricIds: string[]): Promise<{ [metricId: string]: MetricValue }> {
    console.log(`Fetching metric values for ${metricIds.length} metrics:`, metricIds);
    
    const metricValues: { [metricId: string]: MetricValue } = {};
    
    // Fetch each metric value individually using primary key
    for (const metricId of metricIds) {
      try {
        const command = new GetCommand({
          TableName: METRIC_VALUES_TABLE,
          Key: { metricId }
        });

        const response = await docClient.send(command);
        
        if (response.Item) {
          const metricValue = response.Item as MetricValue;
          metricValues[metricId] = metricValue;
          console.log(`Retrieved metric value for ${metricId}: $${metricValue.dollarsPerUnit}/unit`);
        } else {
          console.warn(`No metric value found for ${metricId}`);
        }
      } catch (error) {
        console.error(`Error fetching metric value for ${metricId}:`, error);
      }
    }

    console.log(`Successfully retrieved ${Object.keys(metricValues).length}/${metricIds.length} metric values`);
    return metricValues;
  }

  /**
   * Save experiment analysis results
   */
  async saveExperimentAnalysis(
    experimentId: string,
    didResults: { [metricId: string]: any },
    economicImpact: any,
    metricValuesSnapshot: { [metricId: string]: any },
    experimentPeriod: { startDate: string; endDate: string; durationDays: number },
    version = '1.0.0'
  ): Promise<string> {
    const analysisId = `${Date.now()}-${uuidv4()}`;
    const analysisTimestamp = new Date().toISOString();
    
    console.log(`Saving experiment analysis for experimentId: ${experimentId}, analysisId: ${analysisId}`);

    const experimentAnalysis: ExperimentAnalysis = {
      experimentId,
      analysisId,
      didResults,
      economicImpact,
      metricValuesSnapshot,
      analysisTimestamp,
      experimentPeriod,
      status: 'complete',
      version
    };

    try {
      const command = new PutCommand({
        TableName: EXPERIMENT_ANALYSIS_TABLE,
        Item: experimentAnalysis,
        ConditionExpression: 'attribute_not_exists(experimentId) AND attribute_not_exists(analysisId)'
      });

      await docClient.send(command);
      
      console.log(`Successfully saved experiment analysis: ${analysisId}`);
      return analysisId;
    } catch (error) {
      console.error(`Error saving experiment analysis for experimentId ${experimentId}:`, error);
      throw new Error(`Failed to save experiment analysis: ${error}`);
    }
  }

  /**
   * Update analysis status (for error handling)
   */
  async updateAnalysisStatus(
    experimentId: string,
    analysisId: string,
    status: 'processing' | 'complete' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    console.log(`Updating analysis status: ${experimentId}/${analysisId} -> ${status}`);

    try {
      const updateExpression = errorMessage 
        ? 'SET #status = :status, #errorMessage = :errorMessage, #updatedAt = :updatedAt'
        : 'SET #status = :status, #updatedAt = :updatedAt';

      const expressionAttributeNames: { [key: string]: string } = {
        '#status': 'status',
        '#updatedAt': 'updatedAt'
      };

      const expressionAttributeValues: { [key: string]: any } = {
        ':status': status,
        ':updatedAt': new Date().toISOString()
      };

      if (errorMessage) {
        expressionAttributeNames['#errorMessage'] = 'errorMessage';
        expressionAttributeValues[':errorMessage'] = errorMessage;
      }

      const command = new UpdateCommand({
        TableName: EXPERIMENT_ANALYSIS_TABLE,
        Key: { experimentId, analysisId },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues
      });

      await docClient.send(command);
      
      console.log(`Successfully updated analysis status: ${experimentId}/${analysisId} -> ${status}`);
    } catch (error) {
      console.error(`Error updating analysis status for ${experimentId}/${analysisId}:`, error);
      throw new Error(`Failed to update analysis status: ${error}`);
    }
  }

  /**
   * Get latest analysis for an experiment
   */
  async getLatestAnalysis(experimentId: string): Promise<ExperimentAnalysis | null> {
    console.log(`Fetching latest analysis for experimentId: ${experimentId}`);
    
    try {
      const command = new QueryCommand({
        TableName: EXPERIMENT_ANALYSIS_TABLE,
        KeyConditionExpression: 'experimentId = :experimentId',
        ExpressionAttributeValues: {
          ':experimentId': experimentId
        },
        ScanIndexForward: false, // Sort by analysisId descending (latest first)
        Limit: 1
      });

      const response = await docClient.send(command);
      
      if (!response.Items || response.Items.length === 0) {
        console.log(`No analysis found for experimentId: ${experimentId}`);
        return null;
      }

      console.log(`Successfully retrieved latest analysis for experimentId: ${experimentId}`);
      return response.Items[0] as ExperimentAnalysis;
    } catch (error) {
      console.error(`Error fetching latest analysis for experimentId ${experimentId}:`, error);
      throw new Error(`Failed to fetch latest analysis: ${error}`);
    }
  }

  /**
   * Check if analysis already exists for this experiment (to avoid duplicate processing)
   */
  async analysisExists(experimentId: string, generatedAt: string): Promise<boolean> {
    console.log(`Checking if analysis exists for experimentId: ${experimentId}, generatedAt: ${generatedAt}`);
    
    try {
      // Convert generatedAt to timestamp for analysisId prefix matching
      const generatedTimestamp = new Date(generatedAt).getTime().toString();
      
      const command = new QueryCommand({
        TableName: EXPERIMENT_ANALYSIS_TABLE,
        KeyConditionExpression: 'experimentId = :experimentId AND begins_with(analysisId, :timestampPrefix)',
        ExpressionAttributeValues: {
          ':experimentId': experimentId,
          ':timestampPrefix': generatedTimestamp.substring(0, 10) // Use first 10 digits of timestamp for prefix matching
        },
        Select: 'COUNT'
      });

      const response = await docClient.send(command);
      const exists = (response.Count || 0) > 0;
      
      console.log(`Analysis exists check for ${experimentId}: ${exists} (timestamp prefix: ${generatedTimestamp.substring(0, 10)})`);
      return exists;
    } catch (error) {
      console.error(`Error checking analysis existence for experimentId ${experimentId}:`, error);
      // Return false to allow processing in case of query errors
      return false;
    }
  }

  /**
   * Health check for DynamoDB connections
   */
  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
      // Simple health check - try to describe one of the tables
      const command = new GetCommand({
        TableName: EXPERIMENT_RESULTS_TABLE,
        Key: { experimentId: 'health-check' }
      });

      await docClient.send(command);
      
      return { healthy: true };
    } catch (error) {
      console.error('DynamoDB health check failed:', error);
      return { 
        healthy: false, 
        error: `DynamoDB connection failed: ${error}` 
      };
    }
  }
}

// Export singleton instance
export const dynamoService = new DynamoDBService();