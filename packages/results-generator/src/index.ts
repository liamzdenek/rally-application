import { v4 as uuidv4 } from 'uuid';
import { ExperimentResult, ExperimentDefinition } from '@rallyuxr/shared';
import { DynamoDBService } from './services/dynamodb';
import { ClaudeParameterService } from './services/claude';
import { generateTimeSeriesData, calculateSummary, GenerationRequest } from './generators/simulation';
import { generateExperimentPeriod } from './generators/timeseries';
import { getMetricType, getDefaultParameters } from './utils/parameters';

export interface ResultsGenerationEvent {
  experimentId: string;
  forceRegenerate?: boolean;
}

export interface ResultsGenerationResponse {
  success: boolean;
  experimentId: string;
  message: string;
  error?: string;
}

export async function handler(event: ResultsGenerationEvent): Promise<ResultsGenerationResponse> {
  console.log('Results generator started', { event });
  
  try {
    const { experimentId, forceRegenerate = false } = event;
    
    if (!experimentId) {
      throw new Error('experimentId is required');
    }
    
    // Initialize services
    const dynamoService = new DynamoDBService();
    const claudeService = new ClaudeParameterService();
    
    // Check if results already exist
    if (!forceRegenerate) {
      const existingResults = await dynamoService.resultsExist(experimentId);
      if (existingResults) {
        console.log('Results already exist for experiment:', experimentId);
        return {
          success: true,
          experimentId,
          message: 'Results already exist'
        };
      }
    }
    
    // Get experiment definition
    const experiment = await dynamoService.getExperiment(experimentId);
    if (!experiment) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }
    
    console.log('Generating results for experiment:', {
      id: experiment.id,
      name: experiment.name,
      metrics: experiment.metrics,
      expectedOutcome: experiment.expectedOutcome
    });
    
    // Prepare metric type information for Claude
    const metricTypes: { [metricId: string]: string } = {};
    experiment.metrics.forEach(metricId => {
      const metricType = getMetricType(metricId);
      metricTypes[metricId] = metricType.type;
    });
    
    // Use Claude to generate simulation parameters
    console.log('Requesting simulation parameters from Claude...');
    const claudeResponse = await claudeService.generateSimulationParameters(experiment, metricTypes);
    console.log('Claude parameters received:', claudeResponse.reasoning);
    
    // Generate experiment period
    const experimentPeriod = generateExperimentPeriod({
      startDate: experiment.startDate,
      endDate: experiment.endDate,
      granularity: 'hour'
    });
    
    // Generate results for each metric
    const metrics: ExperimentResult['metrics'] = {};
    
    for (const metricId of experiment.metrics) {
      console.log('Generating data for metric:', metricId);
      
      // Get parameters from Claude or fallback to defaults
      let parameters = claudeResponse.parameters[metricId];
      if (!parameters) {
        console.log('No Claude parameters for metric, using defaults:', metricId);
        const metricType = getMetricType(metricId);
        parameters = getDefaultParameters(metricType.type);
      }
      
      // Generate time series data
      const generationRequest: GenerationRequest = {
        experimentId,
        metricId,
        startDate: experiment.startDate,
        endDate: experiment.endDate,
        parameters
      };
      
      const timeSeries = generateTimeSeriesData(generationRequest);
      const summary = calculateSummary(timeSeries);
      
      metrics[metricId] = {
        timeSeries,
        summary
      };
      
      console.log('Generated data for metric:', {
        metricId,
        dataPoints: timeSeries.length,
        treatmentMean: summary.treatmentMean.toFixed(4),
        controlMean: summary.controlMean.toFixed(4),
        totalSamples: summary.totalTreatmentSamples + summary.totalControlSamples
      });
    }
    
    // Create experiment result
    const experimentResult: ExperimentResult = {
      experimentId,
      metrics,
      generatedAt: new Date().toISOString(),
      experimentPeriod
    };
    
    // Store results in DynamoDB
    console.log('Storing results in DynamoDB...');
    await dynamoService.storeResults(experimentResult);
    
    console.log('Results generation completed successfully:', {
      experimentId,
      metricsGenerated: Object.keys(metrics).length,
      totalDataPoints: Object.values(metrics).reduce((sum, metric) => sum + metric.timeSeries.length, 0)
    });
    
    return {
      success: true,
      experimentId,
      message: `Results generated successfully for ${Object.keys(metrics).length} metrics`
    };
    
  } catch (error) {
    console.error('Error generating results:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      success: false,
      experimentId: event.experimentId || 'unknown',
      message: 'Results generation failed',
      error: errorMessage
    };
  }
}

/**
 * Health check endpoint for the Lambda function
 */
export async function healthCheck(): Promise<{
  status: string;
  timestamp: string;
  dependencies: any;
}> {
  console.log('Performing health check...');
  
  const dependencies: any = {
    dynamodb: 'unknown',
    claude: 'unknown',
    environment: {
      hasClaudeApiKey: !!process.env.CLAUDE_API_KEY,
      hasResultsTable: !!process.env.EXPERIMENT_RESULTS_TABLE,
      hasExperimentsTable: !!process.env.EXPERIMENT_DEFINITION_TABLE,
      awsRegion: process.env.AWS_REGION || 'not-set'
    }
  };
  
  // Check DynamoDB connectivity
  try {
    const dynamoService = new DynamoDBService();
    const dbHealth = await dynamoService.healthCheck();
    dependencies.dynamodb = {
      status: dbHealth.experimentsTable && dbHealth.resultsTable ? 'healthy' : 'partial',
      tables: dbHealth
    };
  } catch (error) {
    dependencies.dynamodb = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
  
  // Check Claude API connectivity
  try {
    const claudeService = new ClaudeParameterService();
    // We don't make an actual API call here to avoid costs
    dependencies.claude = {
      status: 'configured',
      hasApiKey: !!process.env.CLAUDE_API_KEY
    };
  } catch (error) {
    dependencies.claude = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
  
  const allHealthy = dependencies.dynamodb.status === 'healthy' && 
                    dependencies.claude.status === 'configured';
  
  const result = {
    status: allHealthy ? 'healthy' : 'partial',
    timestamp: new Date().toISOString(),
    dependencies
  };
  
  console.log('Health check completed:', result);
  return result;
}