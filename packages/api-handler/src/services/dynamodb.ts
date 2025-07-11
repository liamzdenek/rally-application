import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { ExperimentDefinition, MetricValue, ExperimentResult } from '@rallyuxr/shared';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamodb = DynamoDBDocument.from(client);

const EXPERIMENTS_TABLE = process.env.EXPERIMENTS_TABLE_NAME;
const METRIC_VALUES_TABLE = process.env.METRIC_VALUES_TABLE_NAME;
const RESULTS_TABLE = process.env.RESULTS_TABLE_NAME;

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
      Key: { id },
    });
    
    if (!existing.Item) {
      console.log('Metric not found:', id);
      return null;
    }
    
    const updatedMetric = { ...existing.Item, ...updates, id };
    
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
}

export const dynamodbService = new DynamoDBService();