import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { ExperimentResult, ExperimentDefinition } from '@rallyuxr/shared';

export class DynamoDBService {
  private client: DynamoDBDocumentClient;
  private resultsTableName: string;
  private experimentsTableName: string;

  constructor() {
    const region = process.env.AWS_REGION || 'us-east-1';
    this.resultsTableName = process.env.EXPERIMENT_RESULTS_TABLE || '';
    this.experimentsTableName = process.env.EXPERIMENT_DEFINITION_TABLE || '';
    
    if (!this.resultsTableName || !this.experimentsTableName) {
      throw new Error('EXPERIMENT_RESULTS_TABLE and EXPERIMENT_DEFINITION_TABLE environment variables are required');
    }
    
    const dynamoClient = new DynamoDBClient({ region });
    this.client = DynamoDBDocumentClient.from(dynamoClient);
    
    console.log('DynamoDB service initialized', {
      region,
      resultsTableName: this.resultsTableName,
      experimentsTableName: this.experimentsTableName
    });
  }

  /**
   * Get experiment definition by ID
   */
  async getExperiment(experimentId: string): Promise<ExperimentDefinition | null> {
    console.log('Fetching experiment from DynamoDB:', experimentId);
    
    try {
      const response = await this.client.send(new GetCommand({
        TableName: this.experimentsTableName,
        Key: { id: experimentId }
      }));
      
      if (!response.Item) {
        console.log('Experiment not found:', experimentId);
        return null;
      }
      
      console.log('Experiment retrieved successfully:', experimentId);
      return response.Item as ExperimentDefinition;
    } catch (error) {
      console.error('Error fetching experiment:', error);
      throw error;
    }
  }

  /**
   * Store experiment results in DynamoDB
   */
  async storeResults(results: ExperimentResult): Promise<void> {
    console.log('Storing experiment results:', results.experimentId);
    
    try {
      await this.client.send(new PutCommand({
        TableName: this.resultsTableName,
        Item: results
      }));
      
      console.log('Results stored successfully:', results.experimentId);
    } catch (error) {
      console.error('Error storing results:', error);
      throw error;
    }
  }

  /**
   * Check if results already exist for an experiment
   */
  async resultsExist(experimentId: string): Promise<boolean> {
    console.log('Checking if results exist for experiment:', experimentId);
    
    try {
      const response = await this.client.send(new GetCommand({
        TableName: this.resultsTableName,
        Key: { experimentId }
      }));
      
      const exists = !!response.Item;
      console.log('Results exist check:', experimentId, exists);
      return exists;
    } catch (error) {
      console.error('Error checking if results exist:', error);
      return false; // Assume they don't exist if we can't check
    }
  }

  /**
   * Health check - verify DynamoDB connectivity
   */
  async healthCheck(): Promise<{ experimentsTable: boolean; resultsTable: boolean }> {
    console.log('Performing DynamoDB health check');
    
    const results = {
      experimentsTable: false,
      resultsTable: false
    };
    
    try {
      // Try to perform a simple query on experiments table
      await this.client.send(new GetCommand({
        TableName: this.experimentsTableName,
        Key: { id: 'health-check-dummy-id' }
      }));
      results.experimentsTable = true;
    } catch (error) {
      console.error('Experiments table health check failed:', error);
    }
    
    try {
      // Try to perform a simple query on results table
      await this.client.send(new GetCommand({
        TableName: this.resultsTableName,
        Key: { experimentId: 'health-check-dummy-id' }
      }));
      results.resultsTable = true;
    } catch (error) {
      console.error('Results table health check failed:', error);
    }
    
    console.log('DynamoDB health check completed:', results);
    return results;
  }
}