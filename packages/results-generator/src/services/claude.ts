import Anthropic from '@anthropic-ai/sdk';
import { ExperimentDefinition } from '@rallyuxr/shared';
import { SimulationParameters } from '../generators/simulation';

interface ClaudeParameterResponse {
  parameters: {
    [metricId: string]: SimulationParameters;
  };
  reasoning: string;
}

export class ClaudeParameterService {
  private client: Anthropic;

  constructor() {
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      throw new Error('CLAUDE_API_KEY environment variable is required');
    }
    
    this.client = new Anthropic({
      apiKey: apiKey
    });
  }

  /**
   * Use Claude API to determine appropriate simulation parameters based on experiment details
   */
  async generateSimulationParameters(
    experiment: ExperimentDefinition,
    metricTypes: { [metricId: string]: string }
  ): Promise<ClaudeParameterResponse> {
    console.log('Requesting simulation parameters from Claude for experiment:', experiment.id);
    
    const prompt = this.buildParameterPrompt(experiment, metricTypes);
    
    try {
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        tools: [
          {
            name: 'generate_simulation_parameters',
            description: 'Generate appropriate simulation parameters for A/B test metrics',
            input_schema: {
              type: 'object',
              properties: {
                parameters: {
                  type: 'object',
                  additionalProperties: {
                    type: 'object',
                    properties: {
                      baseConversionRate: {
                        type: 'number',
                        description: 'Baseline conversion rate (0-1 for rates, actual values for revenue metrics)'
                      },
                      treatmentEffect: {
                        type: 'number',
                        description: 'Relative treatment effect (-1 to 1, where 0.1 = 10% improvement)'
                      },
                      dailyVariance: {
                        type: 'number',
                        description: 'Daily variance in metric values'
                      },
                      sampleSizeRange: {
                        type: 'object',
                        properties: {
                          min: { type: 'number' },
                          max: { type: 'number' }
                        },
                        required: ['min', 'max']
                      },
                      seasonalityFactor: {
                        type: 'number',
                        description: 'Optional seasonal variation factor (0-1)'
                      },
                      trendFactor: {
                        type: 'number',
                        description: 'Optional trend factor (-1 to 1)'
                      }
                    },
                    required: ['baseConversionRate', 'treatmentEffect', 'dailyVariance', 'sampleSizeRange']
                  }
                },
                reasoning: {
                  type: 'string',
                  description: 'Explanation of parameter choices'
                }
              },
              required: ['parameters', 'reasoning']
            }
          }
        ],
        tool_choice: { type: 'tool', name: 'generate_simulation_parameters' }
      });

      if (response.content[0].type === 'tool_use') {
        const result = response.content[0].input as ClaudeParameterResponse;
        console.log('Claude parameter generation successful:', result.reasoning);
        return result;
      } else {
        throw new Error('Unexpected response format from Claude API');
      }
    } catch (error) {
      console.error('Error calling Claude API:', error);
      
      // Fallback to default parameters
      console.log('Using fallback parameters due to Claude API error');
      return this.getFallbackParameters(experiment, metricTypes);
    }
  }

  /**
   * Build the prompt for Claude to generate simulation parameters
   */
  private buildParameterPrompt(
    experiment: ExperimentDefinition,
    metricTypes: { [metricId: string]: string }
  ): string {
    return `
You are an expert in A/B testing and data simulation. Generate realistic simulation parameters for the following experiment:

**Experiment Details:**
- Name: ${experiment.name}
- Description: ${experiment.description}
- Expected Outcome: ${experiment.expectedOutcome}
- Start Date: ${experiment.startDate}
- End Date: ${experiment.endDate}

**Metrics to Simulate:**
${experiment.metrics.map(metricId => `- ${metricId}: ${metricTypes[metricId] || 'unknown type'}`).join('\n')}

For each metric, provide simulation parameters that will generate realistic A/B test data. Consider:

1. **Base Conversion Rate**: Realistic baseline values for each metric type
2. **Treatment Effect**: Size of change based on expected outcome (positive/negative/neutral)
3. **Daily Variance**: Natural day-to-day variation in the metric
4. **Sample Size Range**: Realistic user counts for the experiment duration
5. **Seasonality**: Optional weekly patterns (higher on weekdays vs weekends)
6. **Trend**: Optional gradual changes over the experiment period

**Guidelines:**
- Conversion rates should be between 0.01 and 0.5 (1% to 50%)
- Revenue metrics should reflect realistic dollar amounts
- Treatment effects should be meaningful but realistic (typically 5-25% changes)
- Consider the experiment description to inform parameter choices
- Make the data realistic but clearly demonstrate the expected outcome

Generate parameters that will create convincing demonstration data for this UX experiment.
    `.trim();
  }

  /**
   * Provide fallback parameters if Claude API is unavailable
   */
  private getFallbackParameters(
    experiment: ExperimentDefinition,
    metricTypes: { [metricId: string]: string }
  ): ClaudeParameterResponse {
    const parameters: { [metricId: string]: SimulationParameters } = {};
    
    experiment.metrics.forEach(metricId => {
      const metricType = metricTypes[metricId] || 'conversion';
      
      // Determine treatment effect based on expected outcome
      let treatmentEffect = 0;
      switch (experiment.expectedOutcome) {
        case 'positive':
          treatmentEffect = 0.15; // 15% improvement
          break;
        case 'negative':
          treatmentEffect = -0.10; // 10% decline
          break;
        case 'neutral':
          treatmentEffect = 0.02; // Minimal change
          break;
      }
      
      // Set parameters based on metric type
      if (metricType.toLowerCase().includes('conversion') || metricType.toLowerCase().includes('rate')) {
        parameters[metricId] = {
          baseConversionRate: 0.05, // 5% baseline conversion
          treatmentEffect,
          dailyVariance: 0.01,
          sampleSizeRange: { min: 1000, max: 5000 },
          seasonalityFactor: 0.1,
          trendFactor: 0
        };
      } else if (metricType.toLowerCase().includes('revenue')) {
        parameters[metricId] = {
          baseConversionRate: 25.50, // $25.50 baseline revenue per user
          treatmentEffect,
          dailyVariance: 5.0,
          sampleSizeRange: { min: 500, max: 2000 },
          seasonalityFactor: 0.15,
          trendFactor: 0
        };
      } else {
        // Default parameters
        parameters[metricId] = {
          baseConversionRate: 0.08,
          treatmentEffect,
          dailyVariance: 0.02,
          sampleSizeRange: { min: 800, max: 3000 },
          seasonalityFactor: 0.05,
          trendFactor: 0
        };
      }
    });
    
    return {
      parameters,
      reasoning: 'Used fallback parameters due to Claude API unavailability. Parameters selected based on experiment type and expected outcome.'
    };
  }
}