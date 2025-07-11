import React, { useState } from 'react'
import { MetricValue } from '@rallyuxr/shared'
import { useMetricValues, useCreateMetricValue, useUpdateMetricValue, useDeleteMetricValue } from '../hooks/useApi'
import Button from '../components/Button'
import Card from '../components/Card'
import Loading from '../components/Loading'
import styles from './Settings.module.css'

type MetricCategory = 'conversion' | 'revenue' | 'engagement' | 'retention' | 'other'

interface FormData {
  metricId: string
  name: string
  description: string
  dollarsPerUnit: number
  unit: string
  category: MetricCategory
  validationRules: {
    minValue?: number
    maxValue?: number
    decimalPlaces?: number
  }
}

const defaultFormData: FormData = {
  metricId: '',
  name: '',
  description: '',
  dollarsPerUnit: 0,
  unit: '%',
  category: 'conversion',
  validationRules: {
    minValue: 0,
    maxValue: 100,
    decimalPlaces: 2
  }
}

const unitOptions = ['%', '$', 'seconds', 'minutes', 'hours', 'count', 'ratio']

export default function Settings() {
  const [isCreating, setIsCreating] = useState(false)
  const [editingMetric, setEditingMetric] = useState<MetricValue | null>(null)
  const [formData, setFormData] = useState<FormData>(defaultFormData)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: metricResponse, loading, error, refetch } = useMetricValues()
  const metricValues = metricResponse?.data?.metrics || []
  const { mutate: createMetricValue, loading: creating } = useCreateMetricValue()
  const { mutate: updateMetricValue, loading: updating } = useUpdateMetricValue()
  const { mutate: deleteMetricValue, loading: deleting } = useDeleteMetricValue()

  const handleInputChange = (field: keyof FormData, value: any) => {
    if (field === 'validationRules') {
      setFormData(prev => ({ ...prev, validationRules: { ...prev.validationRules, ...value } }))
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.metricId.trim()) {
      newErrors.metricId = 'Metric ID is required'
    } else if (!/^[a-z_]+$/.test(formData.metricId)) {
      newErrors.metricId = 'Metric ID must contain only lowercase letters and underscores'
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    }

    if (formData.dollarsPerUnit < 0) {
      newErrors.dollarsPerUnit = 'Dollar value must be non-negative'
    }

    if (!formData.unit.trim()) {
      newErrors.unit = 'Unit is required'
    }

    const { validationRules } = formData
    if (validationRules.minValue !== undefined && validationRules.maxValue !== undefined && 
        validationRules.minValue >= validationRules.maxValue) {
      newErrors.validationRules = 'Min value must be less than max value'
    }

    if (validationRules.decimalPlaces !== undefined && validationRules.decimalPlaces < 0) {
      newErrors.validationRules = 'Decimal places must be non-negative'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    const metricData: Omit<MetricValue, 'lastUpdated' | 'version'> = {
      metricId: formData.metricId.trim(),
      name: formData.name.trim(),
      description: formData.description.trim(),
      dollarsPerUnit: formData.dollarsPerUnit,
      unit: formData.unit,
      category: formData.category,
      validationRules: formData.validationRules
    }

    try {
      if (editingMetric) {
        await updateMetricValue({ ...metricData, lastUpdated: new Date().toISOString(), version: editingMetric.version + 1 })
      } else {
        await createMetricValue(metricData)
      }
      
      handleCancel()
      refetch()
    } catch (err) {
      console.error('Failed to save metric value:', err)
    }
  }

  const handleEdit = (metric: MetricValue) => {
    setEditingMetric(metric)
    setFormData({
      metricId: metric.metricId,
      name: metric.name,
      description: metric.description,
      dollarsPerUnit: metric.dollarsPerUnit,
      unit: metric.unit,
      category: metric.category,
      validationRules: metric.validationRules || defaultFormData.validationRules
    })
    setIsCreating(true)
  }

  const handleDelete = async (metricId: string) => {
    if (window.confirm('Are you sure you want to delete this metric value configuration?')) {
      try {
        await deleteMetricValue(metricId)
        refetch()
      } catch (err) {
        console.error('Failed to delete metric value:', err)
      }
    }
  }

  const handleCancel = () => {
    setIsCreating(false)
    setEditingMetric(null)
    setFormData(defaultFormData)
    setErrors({})
  }

  const handleCreateNew = () => {
    setIsCreating(true)
    setEditingMetric(null)
    setFormData(defaultFormData)
    setErrors({})
  }

  if (loading) {
    return (
      <div className={styles.settings}>
        <Loading />
      </div>
    )
  }

  return (
    <div className={styles.settings}>
      <div className={styles.header}>
        <h1>Metric Value Settings</h1>
        <p>Configure economic values and validation rules for your metrics</p>
        
        {!isCreating && (
          <Button variant="primary" onClick={handleCreateNew}>
            Add New Metric Value
          </Button>
        )}
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <p>Failed to load metric values: {typeof error === 'string' ? error : 'Unknown error'}</p>
        </div>
      )}

      {isCreating && (
        <Card>
          <div className={styles.formHeader}>
            <h2>{editingMetric ? 'Edit Metric Value' : 'Create New Metric Value'}</h2>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.section}>
              <h3>Basic Information</h3>
              
              <div className={styles.field}>
                <label htmlFor="metricId">Metric ID</label>
                <input
                  id="metricId"
                  type="text"
                  value={formData.metricId}
                  onChange={(e) => handleInputChange('metricId', e.target.value)}
                  className={errors.metricId ? styles.error : ''}
                  placeholder="e.g., conversion_rate, revenue_per_user"
                  disabled={!!editingMetric}
                />
                {errors.metricId && <span className={styles.errorText}>{errors.metricId}</span>}
              </div>

              <div className={styles.field}>
                <label htmlFor="name">Display Name</label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={errors.name ? styles.error : ''}
                  placeholder="e.g., Conversion Rate, Revenue Per User"
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
                  placeholder="Explain how the economic value is calculated"
                  rows={3}
                />
                {errors.description && <span className={styles.errorText}>{errors.description}</span>}
              </div>

              <div className={styles.field}>
                <label htmlFor="category">Category</label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value as MetricCategory)}
                >
                  <option value="conversion">Conversion</option>
                  <option value="revenue">Revenue</option>
                  <option value="engagement">Engagement</option>
                  <option value="retention">Retention</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className={styles.section}>
              <h3>Economic Value</h3>
              
              <div className={styles.valueFields}>
                <div className={styles.field}>
                  <label htmlFor="dollarsPerUnit">Dollars Per Unit</label>
                  <input
                    id="dollarsPerUnit"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.dollarsPerUnit}
                    onChange={(e) => handleInputChange('dollarsPerUnit', parseFloat(e.target.value) || 0)}
                    className={errors.dollarsPerUnit ? styles.error : ''}
                    placeholder="0.00"
                  />
                  {errors.dollarsPerUnit && <span className={styles.errorText}>{errors.dollarsPerUnit}</span>}
                </div>

                <div className={styles.field}>
                  <label htmlFor="unit">Unit</label>
                  <select
                    id="unit"
                    value={formData.unit}
                    onChange={(e) => handleInputChange('unit', e.target.value)}
                  >
                    {unitOptions.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <h3>Validation Rules</h3>
              
              <div className={styles.validationFields}>
                <div className={styles.field}>
                  <label htmlFor="minValue">Min Value</label>
                  <input
                    id="minValue"
                    type="number"
                    step="0.01"
                    value={formData.validationRules.minValue || ''}
                    onChange={(e) => handleInputChange('validationRules', { minValue: parseFloat(e.target.value) || undefined })}
                    placeholder="Optional"
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="maxValue">Max Value</label>
                  <input
                    id="maxValue"
                    type="number"
                    step="0.01"
                    value={formData.validationRules.maxValue || ''}
                    onChange={(e) => handleInputChange('validationRules', { maxValue: parseFloat(e.target.value) || undefined })}
                    placeholder="Optional"
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="decimalPlaces">Decimal Places</label>
                  <input
                    id="decimalPlaces"
                    type="number"
                    min="0"
                    max="10"
                    value={formData.validationRules.decimalPlaces || ''}
                    onChange={(e) => handleInputChange('validationRules', { decimalPlaces: parseInt(e.target.value) || undefined })}
                    placeholder="Optional"
                  />
                </div>
              </div>
              
              {errors.validationRules && <span className={styles.errorText}>{errors.validationRules}</span>}
            </div>

            <div className={styles.actions}>
              <Button type="button" variant="secondary" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={creating || updating}>
                {editingMetric ? 'Update Metric Value' : 'Create Metric Value'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {!isCreating && metricValues && (
        <div className={styles.metricsList}>
          <h2>Configured Metric Values ({metricValues.length})</h2>
          
          {metricValues.length === 0 ? (
            <Card>
              <div className={styles.emptyState}>
                <p>No metric values configured yet.</p>
                <p>Add your first metric value to get started.</p>
              </div>
            </Card>
          ) : (
            <div className={styles.metricsGrid}>
              {metricValues.map((metric: any) => (
                <Card key={metric.metricId}>
                  <div className={styles.metricCard}>
                    <div className={styles.metricHeader}>
                      <div>
                        <h3>{metric.name}</h3>
                        <p className={styles.metricId}>{metric.metricId}</p>
                      </div>
                      <span className={styles.category}>{metric.category}</span>
                    </div>
                    
                    <div className={styles.metricValue}>
                      <span className={styles.value}>${metric.dollarsPerUnit}</span>
                      <span className={styles.unit}>per {metric.unit}</span>
                    </div>
                    
                    <p className={styles.description}>{metric.description}</p>
                    
                    {metric.validationRules && (
                      <div className={styles.validation}>
                        <p>Validation Rules:</p>
                        <ul>
                          {metric.validationRules.minValue !== undefined && (
                            <li>Min: {metric.validationRules.minValue}</li>
                          )}
                          {metric.validationRules.maxValue !== undefined && (
                            <li>Max: {metric.validationRules.maxValue}</li>
                          )}
                          {metric.validationRules.decimalPlaces !== undefined && (
                            <li>Decimals: {metric.validationRules.decimalPlaces}</li>
                          )}
                        </ul>
                      </div>
                    )}
                    
                    <div className={styles.metricActions}>
                      <Button variant="secondary" size="small" onClick={() => handleEdit(metric)}>
                        Edit
                      </Button>
                      <Button 
                        variant="danger" 
                        size="small" 
                        onClick={() => handleDelete(metric.metricId)}
                        disabled={deleting}
                      >
                        Delete
                      </Button>
                    </div>
                    
                    <div className={styles.metricMeta}>
                      <p>Version {metric.version} • Updated {new Date(metric.lastUpdated).toLocaleDateString()}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}