import React from 'react'
import { useParams } from '@tanstack/react-router'
import { useExperiment, useExperimentResults, useExperimentAnalysis } from '../hooks/useApi'
import Card from '../components/Card'
import Button from '../components/Button'
import Loading from '../components/Loading'
import { TimeSeriesLineChart, ComparisonBarChart, TrendAreaChart, MetricComparison, ChartGrid } from '../components/Charts'
import styles from './ExperimentDetails.module.css'

const ExperimentDetails: React.FC = () => {
  const { experimentId } = useParams({ from: '/experiment/$experimentId' })
  
  const { data: experimentResponse, loading: expLoading, error: expError } = useExperiment(experimentId)
  const { data: resultsResponse, loading: resultsLoading, refetch: refetchResults } = useExperimentResults(experimentId)
  const { data: analysisResponse, loading: analysisLoading, error: analysisError, refetch: refetchAnalysis } = useExperimentAnalysis(experimentId)
  
  const experiment = experimentResponse?.data?.experiment
  const results = resultsResponse?.data?.results
  const analysis = analysisResponse?.data


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
  const chartData = results?.metrics ? (() => {
    const data: Array<{ timestamp: string; treatment: number; control: number }> = []
    
    // Get first metric's time series data
    const firstMetricId = Object.keys(results.metrics)[0]
    if (firstMetricId && results.metrics[firstMetricId]) {
      results.metrics[firstMetricId].timeSeries.forEach((point: any) => {
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
        {analysisLoading ? (
          <Loading message="Loading analysis..." />
        ) : analysisError ? (
          <Card title="Statistical Analysis">
            <div className={styles.error}>
              <p>Error loading analysis: {analysisError}</p>
              <Button onClick={refetchAnalysis}>Retry Analysis</Button>
            </div>
          </Card>
        ) : analysis ? (
          <Card title="Statistical Analysis">
            <div className={styles.analysisGrid}>
              <div className={styles.analysisSection}>
                <h3>Difference-in-Differences Results</h3>
                {analysis.didResults && Object.entries(analysis.didResults).map(([metricId, result]: [string, any]) => (
                  <div key={metricId} className={styles.metricResult}>
                    <h4>{metricId.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</h4>
                    <div className={styles.statGrid}>
                      <div>
                        <strong>Treatment Effect:</strong> {result.treatmentEffect?.toFixed(4) || 'N/A'}
                      </div>
                      <div>
                        <strong>P-Value:</strong> {result.pValue?.toFixed(4) || 'N/A'}
                      </div>
                      <div>
                        <strong>Confidence Interval:</strong>
                        {result.confidenceInterval
                          ? `[${result.confidenceInterval.lower?.toFixed(4)}, ${result.confidenceInterval.upper?.toFixed(4)}]`
                          : 'N/A'
                        }
                      </div>
                      <div>
                        <strong>Significant:</strong>
                        <span className={result.pValue < 0.05 ? styles.significant : styles.notSignificant}>
                          {result.pValue < 0.05 ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {analysis.economicImpact && (
                <div className={styles.analysisSection}>
                  <h3>Economic Impact</h3>
                  <div className={styles.economicGrid}>
                    <div>
                      <strong>Total Impact:</strong> ${analysis.economicImpact.totalImpact?.toFixed(2) || '0.00'}
                    </div>
                    <div>
                      <strong>ROI:</strong> {analysis.economicImpact.roi?.toFixed(2) || '0.00'}%
                    </div>
                    <div>
                      <strong>Sample Size:</strong> {analysis.economicImpact.sampleSize || 'N/A'}
                    </div>
                  </div>
                </div>
              )}
              
              <div className={styles.analysisSection}>
                <h3>Analysis Details</h3>
                <div className={styles.detailsGrid}>
                  <div>
                    <strong>Analysis ID:</strong> {analysis.analysisId}
                  </div>
                  <div>
                    <strong>Created:</strong> {new Date(analysis.createdAt).toLocaleString()}
                  </div>
                  <div>
                    <strong>Status:</strong>
                    <span className={`${styles.statusBadge} ${styles[analysis.status]}`}>
                      {analysis.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <Card title="Statistical Analysis">
            <p>No analysis available yet. Analysis will be generated automatically when sufficient data is collected.</p>
          </Card>
        )}
      </div>
    </div>
  )
}

export default ExperimentDetails