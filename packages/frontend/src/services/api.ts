import { ExperimentDefinition, ExperimentResult, ExperimentAnalysis, MetricValue } from '@rallyuxr/shared'

// API Configuration - will be set from environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://z1r1s9h73b.execute-api.us-west-2.amazonaws.com/prod'

// API Client for making HTTP requests
class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    }

    console.log(`API Request: ${config.method || 'GET'} ${url}`)
    if (config.body) {
      console.log('Request body:', config.body)
    }

    try {
      const response = await fetch(url, config)
      
      console.log(`API Response: ${response.status} ${response.statusText}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`API Error: ${response.status} - ${errorText}`)
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log('Response data:', data)
      return data
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }

  // Experiment endpoints
  async getExperiments(): Promise<{ data: { experiments: ExperimentDefinition[] } }> {
    return this.request<{ data: { experiments: ExperimentDefinition[] } }>('/experiments')
  }

  async getExperiment(id: string): Promise<{ data: { experiment: ExperimentDefinition } }> {
    return this.request<{ data: { experiment: ExperimentDefinition } }>(`/experiments/${id}`)
  }

  async createExperiment(experiment: Omit<ExperimentDefinition, 'id' | 'createdAt' | 'updatedAt'>): Promise<ExperimentDefinition> {
    const response = await this.request<{ data: { experimentId: string; status: string; message: string; estimatedCompletionTime: string } }>('/experiments', {
      method: 'POST',
      body: JSON.stringify(experiment),
    })
    
    // Transform the API response to match ExperimentDefinition interface
    return {
      id: response.data.experimentId,
      name: experiment.name,
      description: experiment.description,
      status: experiment.status || 'draft',
      metrics: experiment.metrics,
      startDate: experiment.startDate,
      endDate: experiment.endDate,
      expectedOutcome: experiment.expectedOutcome,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as ExperimentDefinition
  }

  async updateExperiment(id: string, experiment: Partial<ExperimentDefinition>): Promise<ExperimentDefinition> {
    return this.request<ExperimentDefinition>(`/experiments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(experiment),
    })
  }

  async deleteExperiment(id: string): Promise<void> {
    return this.request<void>(`/experiments/${id}`, {
      method: 'DELETE',
    })
  }

  // Results endpoints
  async getExperimentResults(experimentId: string): Promise<{ data: { results: any } }> {
    return this.request<{ data: { results: any } }>(`/experiments/${experimentId}/results`)
  }

  async submitResult(result: Omit<ExperimentResult, 'id' | 'timestamp'>): Promise<ExperimentResult> {
    return this.request<ExperimentResult>('/results', {
      method: 'POST',
      body: JSON.stringify(result),
    })
  }

  // Analysis endpoints
  async getAnalysis(experimentId: string): Promise<{ data: { experiment: any, analysis: ExperimentAnalysis } }> {
    return this.request<{ data: { experiment: any, analysis: ExperimentAnalysis } }>(`/experiments/${experimentId}/analysis`)
  }

  async triggerAnalysis(experimentId: string): Promise<ExperimentAnalysis> {
    return this.request<ExperimentAnalysis>(`/analysis/${experimentId}`, {
      method: 'POST',
    })
  }

  // Metrics endpoints
  async getMetricValues(): Promise<{ data: { metrics: MetricValue[] } }> {
    return this.request<{ data: { metrics: MetricValue[] } }>('/metric-values')
  }

  async createMetricValue(metric: Omit<MetricValue, 'lastUpdated' | 'version'>): Promise<MetricValue> {
    return this.request<MetricValue>('/metric-values', {
      method: 'POST',
      body: JSON.stringify(metric),
    })
  }

  async updateMetricValue(metric: MetricValue): Promise<MetricValue> {
    return this.request<MetricValue>(`/metric-values/${metric.metricId}`, {
      method: 'PUT',
      body: JSON.stringify(metric),
    })
  }

  async deleteMetricValue(metricId: string): Promise<void> {
    return this.request<void>(`/metric-values/${metricId}`, {
      method: 'DELETE',
    })
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request<{ status: string; timestamp: string }>('/health')
  }
}

// Export singleton API client instance
export const apiClient = new ApiClient(API_BASE_URL)