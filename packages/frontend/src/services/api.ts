import { ExperimentDefinition, ExperimentResult, ExperimentAnalysis, MetricValue } from '@rallyuxr/shared'

// API Configuration - will be set from environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.rally-uxr.com'

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
  async getExperiments(): Promise<ExperimentDefinition[]> {
    return this.request<ExperimentDefinition[]>('/experiments')
  }

  async getExperiment(id: string): Promise<ExperimentDefinition> {
    return this.request<ExperimentDefinition>(`/experiments/${id}`)
  }

  async createExperiment(experiment: Omit<ExperimentDefinition, 'id' | 'createdAt' | 'updatedAt'>): Promise<ExperimentDefinition> {
    return this.request<ExperimentDefinition>('/experiments', {
      method: 'POST',
      body: JSON.stringify(experiment),
    })
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
  async getExperimentResults(experimentId: string): Promise<ExperimentResult[]> {
    return this.request<ExperimentResult[]>(`/results/experiment/${experimentId}`)
  }

  async submitResult(result: Omit<ExperimentResult, 'id' | 'timestamp'>): Promise<ExperimentResult> {
    return this.request<ExperimentResult>('/results', {
      method: 'POST',
      body: JSON.stringify(result),
    })
  }

  // Analysis endpoints
  async getAnalysis(experimentId: string): Promise<ExperimentAnalysis> {
    return this.request<ExperimentAnalysis>(`/analysis/${experimentId}`)
  }

  async triggerAnalysis(experimentId: string): Promise<ExperimentAnalysis> {
    return this.request<ExperimentAnalysis>(`/analysis/${experimentId}`, {
      method: 'POST',
    })
  }

  // Metrics endpoints
  async getMetricValues(): Promise<MetricValue[]> {
    return this.request<MetricValue[]>('/metrics')
  }

  async createMetricValue(metric: Omit<MetricValue, 'lastUpdated' | 'version'>): Promise<MetricValue> {
    return this.request<MetricValue>('/metrics', {
      method: 'POST',
      body: JSON.stringify(metric),
    })
  }

  async updateMetricValue(metric: MetricValue): Promise<MetricValue> {
    return this.request<MetricValue>(`/metrics/${metric.metricId}`, {
      method: 'PUT',
      body: JSON.stringify(metric),
    })
  }

  async deleteMetricValue(metricId: string): Promise<void> {
    return this.request<void>(`/metrics/${metricId}`, {
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