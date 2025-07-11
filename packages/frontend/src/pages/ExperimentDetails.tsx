import React from 'react'
import { useParams } from '@tanstack/react-router'
import { useExperiment, useExperimentResults, useExperimentAnalysis, useTriggerAnalysis } from '../hooks/useApi'
import Card from '../components/Card'
import Button from '../components/Button'
import Loading from '../components/Loading'
import { TimeSeriesLineChart, ComparisonBarChart, TrendAreaChart, MetricComparison, ChartGrid } from '../components/Charts'
import styles from './ExperimentDetails.module.css'

const ExperimentDetails: React.FC = () => {
  const { experimentId } = useParams({ from: '/experiment/$experimentId' })
  
  const { data: experiment, loading: expLoading, error: expError } = useExperiment(experimentId)
  const { data: results, loading: resultsLoading, refetch: refetchResults } = useExperimentResults(experimentId)
  const { data: analysis, loading: analysisLoading, refetch: refetchAnalysis } = useExperimentAnalysis(experimentId)
  const { mutate: triggerAnalysis, loading: triggeringAnalysis } = useTriggerAnalysis()

  const handleTriggerAnalysis = async () => {
    const result = await triggerAnalysis(experimentId)
    if (result) {
      refetchAnalysis()
    }
  }

  if (expLoading) {
    return <Loading message="Loading experiment details..." />
  }

  if (expError || !experiment) {
    return (
      <div className={styles.experimentDetails}>
        <div className={styles.error}>
          <h2>Error Loading Experiment</h2>
          <p>{expError || 'Experiment not found'}</p>
        </div>
      </div>
    )
  }

  // Transform results data for charts - extract time series data from metrics
  const chartData = results ? (() => {
    const data: Array<{ timestamp: string; treatment: number; control: number }> = []
    
    // Get first result and first metric's time series data
    const firstResult = results[0]
    const firstMetricId = Object.keys(firstResult.metrics)[0]
    if (firstMetricId && firstResult.metrics[firstMetricId]) {
      firstResult.metrics[firstMetricId].timeSeries.forEach((point) => {
        data.push({
          timestamp: point.timestamp,
          treatment: point.treatmentValue,
          control: point.controlValue
        })
      })
    }
    
    return data
  })() : []

  return (
    <div className={styles.experimentDetails}>
      <div className={styles.header}>
        <div>
          <h1>{experiment.name}</h1>
          <p className={styles.description}>{experiment.description}</p>
        </div>
        <div className={styles.status}>
          <span className={`${styles.statusBadge} ${styles[experiment.status]}`}>
            {experiment.status}
          </span>
        </div>
      </div>

      <div className={styles.info}>
        <Card title="Experiment Info">
          <div className={styles.infoGrid}>
            <div>
              <strong>Metrics:</strong> {experiment.metrics.join(', ')}
            </div>
            <div>
              <strong>Start Date:</strong> {new Date(experiment.startDate).toLocaleDateString()}
            </div>
            <div>
              <strong>End Date:</strong> {new Date(experiment.endDate).toLocaleDateString()}
            </div>
            <div>
              <strong>Expected Outcome:</strong> {experiment.expectedOutcome}
            </div>
            <div>
              <strong>Created:</strong> {new Date(experiment.createdAt).toLocaleDateString()}
            </div>
            <div>
              <strong>Last Updated:</strong> {new Date(experiment.updatedAt).toLocaleDateString()}
            </div>
          </div>
        </Card>
      </div>

      {resultsLoading ? (
        <Loading message="Loading results..." />
      ) : chartData.length > 0 ? (
        <ChartGrid>
          <TimeSeriesLineChart
            data={chartData}
            title="Results Over Time"
            yAxisLabel="Metric Value"
            height={350}
          />
          
          <ComparisonBarChart
            data={chartData}
            title="Treatment vs Control Comparison"
            yAxisLabel="Average Value"
            height={350}
          />
          
          <TrendAreaChart
            data={chartData}
            title="Cumulative Trends"
            yAxisLabel="Cumulative Value"
            height={350}
          />
        </ChartGrid>
      ) : (
        <Card title="Results">
          <p>No results data available yet.</p>
        </Card>
      )}

      <div className={styles.analysis}>
        <Card title="Statistical Analysis">
          <div className={styles.analysisHeader}>
            <Button
              onClick={handleTriggerAnalysis}
              disabled={triggeringAnalysis || analysisLoading}
              variant="primary"
            >
              {triggeringAnalysis ? 'Analyzing...' : 'Run Analysis'}
            </Button>
          </div>
          
          {analysisLoading ? (
            <Loading message="Loading analysis..." />
          ) : analysis ? (
            <div className={styles.analysisResults}>
              <div className={styles.metrics}>
                {Object.entries(analysis.didResults).map(([metricId, result]) => (
                  <MetricComparison
                    key={metricId}
                    controlValue={result.controlMean}
                    treatmentValue={result.treatmentMean}
                    metricName={metricId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    unit="%"
                    confidenceLevel={result.pValue < 0.05 ? 95 : (1 - result.pValue) * 100}
                  />
                ))}
              </div>
              
              <div className={styles.economicImpact}>
                <h4>Economic Impact</h4>
                <p><strong>Total Impact:</strong> ${analysis.economicImpact.totalImpact.toLocaleString()}</p>
                <p><strong>Annualized Impact:</strong> ${analysis.economicImpact.annualizedImpact.toLocaleString()}</p>
                <p><strong>ROI:</strong> {analysis.economicImpact.roiPercentage.toFixed(1)}%</p>
              </div>
            </div>
          ) : (
            <p>No analysis available. Click "Run Analysis" to generate statistical insights.</p>
          )}
        </Card>
      </div>
    </div>
  )
}

export default ExperimentDetails