import { useState, useEffect } from 'react'
import { apiClient } from '../services/api'
import { ExperimentDefinition, ExperimentResult, ExperimentAnalysis, MetricValue } from '@rallyuxr/shared'

// Generic hook for API requests with loading states
export function useApiRequest<T>(
  requestFn: () => Promise<T>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const result = await requestFn()
        if (!cancelled) {
          setData(result)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'An error occurred')
          console.error('API request failed:', err)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      cancelled = true
    }
  }, dependencies)

  const refetch = () => {
    setLoading(true)
    setError(null)
    const fetchData = async () => {
      try {
        const result = await requestFn()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
        console.error('API refetch failed:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }

  return { data, loading, error, refetch }
}

// Specific hooks for different entities
export function useExperiments() {
  return useApiRequest(() => apiClient.getExperiments())
}

export function useExperiment(id: string) {
  return useApiRequest(() => apiClient.getExperiment(id), [id])
}

export function useExperimentResults(experimentId: string) {
  return useApiRequest(() => apiClient.getExperimentResults(experimentId), [experimentId])
}

export function useExperimentAnalysis(experimentId: string) {
  return useApiRequest(() => apiClient.getAnalysis(experimentId), [experimentId])
}

export function useMetricValues() {
  return useApiRequest(() => apiClient.getMetricValues())
}

// Hook for creating/updating data with mutation state
export function useApiMutation<TInput, TOutput>(
  mutationFn: (input: TInput) => Promise<TOutput>
) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = async (input: TInput): Promise<TOutput | null> => {
    try {
      setLoading(true)
      setError(null)
      const result = await mutationFn(input)
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('API mutation failed:', err)
      return null
    } finally {
      setLoading(false)
    }
  }

  return { mutate, loading, error }
}

// Specific mutation hooks
export function useCreateExperiment() {
  return useApiMutation((experiment: Omit<ExperimentDefinition, 'id' | 'createdAt' | 'updatedAt'>) =>
    apiClient.createExperiment(experiment)
  )
}

export function useUpdateExperiment() {
  return useApiMutation(({ id, experiment }: { id: string; experiment: Partial<ExperimentDefinition> }) =>
    apiClient.updateExperiment(id, experiment)
  )
}

export function useSubmitResult() {
  return useApiMutation((result: Omit<ExperimentResult, 'id' | 'timestamp'>) =>
    apiClient.submitResult(result)
  )
}

export function useUpdateMetricValue() {
  return useApiMutation((metric: MetricValue) =>
    apiClient.updateMetricValue(metric)
  )
}

export function useCreateMetricValue() {
  return useApiMutation((metric: Omit<MetricValue, 'lastUpdated' | 'version'>) =>
    apiClient.createMetricValue(metric)
  )
}

export function useDeleteMetricValue() {
  return useApiMutation((metricId: string) =>
    apiClient.deleteMetricValue(metricId)
  )
}

export function useTriggerAnalysis() {
  return useApiMutation((experimentId: string) =>
    apiClient.triggerAnalysis(experimentId)
  )
}