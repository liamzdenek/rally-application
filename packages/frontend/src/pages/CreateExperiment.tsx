import React, { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ExperimentDefinition } from '@rallyuxr/shared'
import { useCreateExperiment } from '../hooks/useApi'
import Button from '../components/Button'
import Card from '../components/Card'
import Loading from '../components/Loading'
import styles from './CreateExperiment.module.css'

type ExperimentStatus = 'draft' | 'running' | 'complete' | 'archived'
type ExpectedOutcome = 'positive' | 'negative' | 'neutral'

interface FormData {
  name: string
  description: string
  metrics: string[]
  startDate: string
  endDate: string
  expectedOutcome: ExpectedOutcome
}

const defaultFormData: FormData = {
  name: '',
  description: '',
  metrics: [],
  startDate: '',
  endDate: '',
  expectedOutcome: 'positive'
}

const availableMetrics = [
  'conversion_rate',
  'revenue_per_user',
  'session_duration',
  'bounce_rate',
  'click_through_rate',
  'user_engagement',
  'retention_rate'
]

export default function CreateExperiment() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<FormData>(defaultFormData)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { mutate: createExperiment, loading, error } = useCreateExperiment()

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleMetricToggle = (metric: string) => {
    setFormData(prev => ({
      ...prev,
      metrics: prev.metrics.includes(metric)
        ? prev.metrics.filter(m => m !== metric)
        : [...prev.metrics, metric]
    }))
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Experiment name is required'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    }

    if (formData.metrics.length === 0) {
      newErrors.metrics = 'At least one metric must be selected'
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required'
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required'
    }

    if (formData.startDate && formData.endDate && new Date(formData.startDate) >= new Date(formData.endDate)) {
      newErrors.endDate = 'End date must be after start date'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    const experimentData: Omit<ExperimentDefinition, 'id' | 'createdAt' | 'updatedAt'> = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      status: 'draft' as ExperimentStatus,
      metrics: formData.metrics,
      startDate: formData.startDate,
      endDate: formData.endDate,
      expectedOutcome: formData.expectedOutcome
    }

    try {
      const result = await createExperiment(experimentData)
      if (result) {
        navigate({ to: '/experiment/$experimentId', params: { experimentId: result.id } })
      }
    } catch (err) {
      console.error('Failed to create experiment:', err)
    }
  }

  const handleCancel = () => {
    navigate({ to: '/' })
  }

  if (loading) {
    return (
      <div className={styles.createExperiment}>
        <Loading />
      </div>
    )
  }

  return (
    <div className={styles.createExperiment}>
      <div className={styles.header}>
        <h1>Create New Experiment</h1>
        <p>Design and configure your A/B test experiment</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && (
            <div className={styles.errorBanner}>
              <p>Failed to create experiment: {typeof error === 'string' ? error : 'Unknown error'}</p>
            </div>
          )}

          <div className={styles.section}>
            <h3>Basic Information</h3>
            
            <div className={styles.field}>
              <label htmlFor="name">Experiment Name</label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={errors.name ? styles.error : ''}
                placeholder="Enter a descriptive name for your experiment"
              />
              {errors.name && <span className={styles.errorText}>{errors.name}</span>}
            </div>

            <div className={styles.field}>
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className={errors.description ? styles.error : ''}
                placeholder="Describe what this experiment is testing"
                rows={3}
              />
              {errors.description && <span className={styles.errorText}>{errors.description}</span>}
            </div>

            <div className={styles.field}>
              <label htmlFor="expectedOutcome">Expected Outcome</label>
              <select
                id="expectedOutcome"
                value={formData.expectedOutcome}
                onChange={(e) => handleInputChange('expectedOutcome', e.target.value as ExpectedOutcome)}
                className={errors.expectedOutcome ? styles.error : ''}
              >
                <option value="positive">Positive Impact Expected</option>
                <option value="negative">Negative Impact Expected</option>
                <option value="neutral">Neutral/No Impact Expected</option>
              </select>
              {errors.expectedOutcome && <span className={styles.errorText}>{errors.expectedOutcome}</span>}
            </div>
          </div>

          <div className={styles.section}>
            <h3>Metrics</h3>
            
            <div className={styles.field}>
              <label>Select Metrics to Track</label>
              <div className={styles.metricsGrid}>
                {availableMetrics.map(metric => (
                  <div key={metric} className={styles.metricOption}>
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.metrics.includes(metric)}
                        onChange={() => handleMetricToggle(metric)}
                      />
                      <span>{metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                    </label>
                  </div>
                ))}
              </div>
              {errors.metrics && <span className={styles.errorText}>{errors.metrics}</span>}
            </div>
          </div>

          <div className={styles.section}>
            <h3>Timeline</h3>
            
            <div className={styles.dateFields}>
              <div className={styles.field}>
                <label htmlFor="startDate">Start Date</label>
                <input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  className={errors.startDate ? styles.error : ''}
                />
                {errors.startDate && <span className={styles.errorText}>{errors.startDate}</span>}
              </div>

              <div className={styles.field}>
                <label htmlFor="endDate">End Date</label>
                <input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  className={errors.endDate ? styles.error : ''}
                />
                {errors.endDate && <span className={styles.errorText}>{errors.endDate}</span>}
              </div>
            </div>
          </div>

          <div className={styles.actions}>
            <Button type="button" variant="secondary" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              Create Experiment
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}