import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { ExperimentDefinition, MetricValue, ExperimentResult, ExperimentAnalysis } from '@rallyuxr/shared';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamodb = DynamoDBDocument.from(client);

const EXPERIMENTS_TABLE = process.env.EXPERIMENT_DEFINITION_TABLE;
const METRIC_VALUES_TABLE = process.env.METRIC_VALUES_TABLE;
const RESULTS_TABLE = process.env.EXPERIMENT_RESULTS_TABLE;
const ANALYSIS_TABLE = process.env.EXPERIMENT_ANALYSIS_TABLE;

export class DynamoDBService {
  // Experiments
  async createExperiment(experiment: ExperimentDefinition): Promise<ExperimentDefinition> {
    console.log('Creating experiment:', JSON.stringify(experiment));
    
    await dynamodb.put({
      TableName: EXPERIMENTS_TABLE!,
      Item: experiment,
    });
    
    console.log('Experiment created successfully');
    return experiment;
  }

  async listExperiments(): Promise<ExperimentDefinition[]> {
    console.log('Listing experiments');
    
    const result = await dynamodb.scan({
      TableName: EXPERIMENTS_TABLE!,
    });
    
    console.log(`Found ${result.Items?.length || 0} experiments`);
    return (result.Items as ExperimentDefinition[]) || [];
  }

  async getExperiment(id: string): Promise<ExperimentDefinition | null> {
    console.log('Getting experiment:', id);
    
    const result = await dynamodb.get({
      TableName: EXPERIMENTS_TABLE!,
      Key: { id },
    });
    
    console.log('Experiment found:', !!result.Item);
    return (result.Item as ExperimentDefinition) || null;
  }

  async getExperimentResults(experimentId: string): Promise<ExperimentResult | null> {
    console.log('Getting experiment results:', experimentId);
    
    const result = await dynamodb.get({
      TableName: RESULTS_TABLE!,
      Key: { experimentId },
    });
    
    console.log('Results found:', !!result.Item);
    return (result.Item as ExperimentResult) || null;
  }

  // Metric Values
  async getAllMetricConfigurations(): Promise<MetricValue[]> {
    console.log('Getting all metric configurations');
    
    const result = await dynamodb.scan({
      TableName: METRIC_VALUES_TABLE!,
    });
    
    console.log(`Found ${result.Items?.length || 0} metric configurations`);
    return (result.Items as MetricValue[]) || [];
  }

  async updateMetricValue(id: string, updates: Partial<MetricValue>): Promise<MetricValue | null> {
    console.log('Updating metric value:', id, JSON.stringify(updates));
    
    // First check if the metric exists
    const existing = await dynamodb.get({
      TableName: METRIC_VALUES_TABLE!,
      Key: { metricId: id },
    });
    
    if (!existing.Item) {
      console.log('Metric not found:', id);
      return null;
    }
    
    const updatedMetric = { ...existing.Item, ...updates, metricId: id };
    
    await dynamodb.put({
      TableName: METRIC_VALUES_TABLE!,
      Item: updatedMetric,
    });
    
    console.log('Metric updated successfully');
    return updatedMetric as MetricValue;
  }

  async createMetricConfiguration(metric: MetricValue): Promise<MetricValue> {
    console.log('Creating metric configuration:', JSON.stringify(metric));
    
    await dynamodb.put({
      TableName: METRIC_VALUES_TABLE!,
      Item: metric,
    });
    
    console.log('Metric configuration created successfully');
    return metric;
  }

  // Analysis Methods
  async getLatestExperimentAnalysis(experimentId: string): Promise<ExperimentAnalysis | null> {
    console.log('Getting latest analysis for experiment:', experimentId);
    
    const result = await dynamodb.query({
      TableName: ANALYSIS_TABLE!,
      KeyConditionExpression: 'experimentId = :experimentId',
      ExpressionAttributeValues: {
        ':experimentId': experimentId,
      },
      ScanIndexForward: false, // Sort by analysisId descending to get latest first
      Limit: 1,
    });
    
    console.log('Latest analysis found:', !!result.Items?.[0]);
    return (result.Items?.[0] as ExperimentAnalysis) || null;
  }

  async listExperimentAnalyses(experimentId: string): Promise<ExperimentAnalysis[]> {
    console.log('Listing all analyses for experiment:', experimentId);
    
    const result = await dynamodb.query({
      TableName: ANALYSIS_TABLE!,
      KeyConditionExpression: 'experimentId = :experimentId',
      ExpressionAttributeValues: {
        ':experimentId': experimentId,
      },
      ScanIndexForward: false, // Sort by analysisId descending (newest first)
    });
    
    console.log(`Found ${result.Items?.length || 0} analyses for experiment ${experimentId}`);
    return (result.Items as ExperimentAnalysis[]) || [];
  }

  async getExperimentAnalysis(experimentId: string, analysisId: string): Promise<ExperimentAnalysis | null> {
    console.log('Getting specific analysis:', experimentId, analysisId);
    
    const result = await dynamodb.get({
      TableName: ANALYSIS_TABLE!,
      Key: {
        experimentId,
        analysisId
      },
    });
    
    console.log('Analysis found:', !!result.Item);
    return (result.Item as ExperimentAnalysis) || null;
  }
}

export const dynamodbService = new DynamoDBService();