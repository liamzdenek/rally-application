import React, { useState } from 'react'
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
  const analysis = analysisResponse?.data?.analysis

  // State for collapsible sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    details: false,
    charts: false,
    statisticalDetails: false
  })

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
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

  // Transform results data for charts
  const chartDataByMetric = results?.metrics ? Object.keys(results.metrics).reduce((acc, metricId) => {
    const metricData = results.metrics[metricId]
    if (metricData && metricData.timeSeries) {
      acc[metricId] = metricData.timeSeries.map((point: any) => ({
        timestamp: point.timestamp,
        treatment: point.treatmentValue,
        control: point.controlValue,
        metricId: metricId
      }))
    }
    return acc
  }, {} as Record<string, Array<{ timestamp: string; treatment: number; control: number; metricId: string }>>) : {}

  const hasChartData = Object.keys(chartDataByMetric).length > 0

  return (
    <div className={styles.experimentDetails}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1>{experiment.name}</h1>
          <p className={styles.description}>{experiment.description}</p>
        </div>
      </div>

      {/* Key Results Summary - Always Visible */}
      <div className={styles.keyResultsSection}>
        {analysisLoading ? (
          <Loading message="Loading analysis..." />
        ) : analysisError ? (
          <Card title="🔍 Experiment Results" variant="highlighted">
            <div className={styles.error}>
              <p>We're still generating the analysis. Please refresh in a few moments.</p>
              <Button onClick={refetchAnalysis}>Reload Analysis</Button>
            </div>
          </Card>
        ) : analysis ? (
          <Card title="🔍 Key Results" variant="highlighted">
            <div className={styles.keyResults}>
              {/* Economic Impact Summary */}
              {analysis.economicImpact && (
                <div className={styles.impactSummary}>
                  <div className={styles.primaryImpact}>
                    <span className={styles.impactLabel}>Financial Impact</span>
                    <span className={styles.impactValue}>
                      ${analysis.economicImpact.totalImpact?.toFixed(2) || '0.00'}
                    </span>
                    <span className={styles.roiValue}>
                      {analysis.economicImpact.roiPercentage?.toFixed(1) || '0.0'}% ROI
                    </span>
                  </div>
                </div>
              )}

              {/* Metrics Summary */}
              <div className={styles.metricsOverview}>
                {analysis?.didResults && Object.entries(analysis.didResults).map(([metricId, result]: [string, any]) => (
                  <div key={metricId} className={styles.metricSummaryCard}>
                    <div className={styles.metricName}>
                      {metricId.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </div>
                    <div className={styles.metricChange}>
                      {(result.relativeDifference * 100)?.toFixed(1) || '0.0'}%
                      <span className={result.pValue < 0.05 ? styles.significant : styles.notSignificant}>
                        {result.pValue < 0.05 ? '✓' : '~'}
                      </span>
                    </div>
                    <div className={styles.metricLabel}>
                      {result.pValue < 0.05 ? 'Significant' : 'Not Significant'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ) : (
          <Card title="🔍 Experiment Results">
            <div className={styles.noResults}>
              <p>Analysis in progress...</p>
              <small>Results will appear here once analysis is complete.</small>
            </div>
          </Card>
        )}
      </div>

      {/* Collapsible Sections */}
      <div className={styles.collapsibleSections}>
        
        {/* Statistical Details */}
        {analysis && (
          <div className={styles.collapsibleSection}>
            <button 
              className={styles.sectionToggle}
              onClick={() => toggleSection('statisticalDetails')}
            >
              <span>📊 Statistical Details</span>
              <span className={expandedSections.statisticalDetails ? styles.toggleOpen : styles.toggleClosed}>
                {expandedSections.statisticalDetails ? '−' : '+'}
              </span>
            </button>
            
            {expandedSections.statisticalDetails && (
              <div className={styles.sectionContent}>
                <Card>
                  <div className={styles.analysisGrid}>
                    {analysis?.didResults && Object.entries(analysis.didResults).map(([metricId, result]: [string, any]) => (
                      <div key={metricId} className={styles.metricResult}>
                        <h4 className={styles.metricTitle}>
                          {metricId.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </h4>
                        
                        <div className={styles.statGrid}>
                          <div className={styles.statItem}>
                            <span className={styles.statLabel}>Absolute Difference</span>
                            <span className={styles.statValue}>{result.absoluteDifference?.toFixed(4) || 'N/A'}</span>
                          </div>
                          <div className={styles.statItem}>
                            <span className={styles.statLabel}>P-Value</span>
                            <span className={styles.statValue}>{result.pValue?.toFixed(4) || 'N/A'}</span>
                          </div>
                          <div className={styles.statItem}>
                            <span className={styles.statLabel}>Effect Size</span>
                            <span className={styles.statValue}>{result.effectSize?.toFixed(3) || 'N/A'}</span>
                          </div>
                          <div className={styles.statItem}>
                            <span className={styles.statLabel}>Confidence Interval (95%)</span>
                            <span className={styles.statValue}>
                              {result.confidenceInterval 
                                ? `[${result.confidenceInterval.lower?.toFixed(4)}, ${result.confidenceInterval.upper?.toFixed(4)}]`
                                : 'N/A'
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* Charts Section */}
        <div className={styles.collapsibleSection}>
          <button 
            className={styles.sectionToggle}
            onClick={() => toggleSection('charts')}
          >
            <span>📈 Data Visualization</span>
            <span className={expandedSections.charts ? styles.toggleOpen : styles.toggleClosed}>
              {expandedSections.charts ? '−' : '+'}
            </span>
          </button>
          
          {expandedSections.charts && (
            <div className={styles.sectionContent}>
              {resultsLoading ? (
                <Loading message="Loading results..." />
              ) : hasChartData ? (
                <div className={styles.chartsSection}>
                  {Object.entries(chartDataByMetric).map(([metricId, data]) => (
                    <Card 
                      key={metricId} 
                      title={`${metricId.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Results`}
                    >
                      <div className={styles.metricChartContainer}>
                        <ChartGrid>
                          <TimeSeriesLineChart
                            data={data}
                            title={`${metricId.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Over Time`}
                            yAxisLabel="Metric Value"
                            height={300}
                          />
                          
                          <ComparisonBarChart
                            data={data}
                            title={`Treatment vs Control`}
                            yAxisLabel="Average Value"
                            height={300}
                          />
                        </ChartGrid>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <div className={styles.noData}>
                    <p>No chart data available yet.</p>
                    <small>Charts will appear here once experiment data is collected.</small>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Experiment Details */}
        <div className={styles.collapsibleSection}>
          <button 
            className={styles.sectionToggle}
            onClick={() => toggleSection('details')}
          >
            <span>📝 Experiment Details</span>
            <span className={expandedSections.details ? styles.toggleOpen : styles.toggleClosed}>
              {expandedSections.details ? '−' : '+'}
            </span>
          </button>
          
          {expandedSections.details && (
            <div className={styles.sectionContent}>
              <Card>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <strong>Metrics:</strong> {experiment.metrics.join(', ')}
                  </div>
                  <div className={styles.infoItem}>
                    <strong>Start Date:</strong> {new Date(experiment.startDate).toLocaleDateString()}
                  </div>
                  <div className={styles.infoItem}>
                    <strong>End Date:</strong> {new Date(experiment.endDate).toLocaleDateString()}
                  </div>
                  <div className={styles.infoItem}>
                    <strong>Expected Outcome:</strong> {experiment.expectedOutcome}
                  </div>
                  <div className={styles.infoItem}>
                    <strong>Created:</strong> {new Date(experiment.createdAt).toLocaleDateString()}
                  </div>
                  <div className={styles.infoItem}>
                    <strong>Last Updated:</strong> {new Date(experiment.updatedAt).toLocaleDateString()}
                  </div>
                  {analysis && (
                    <>
                      <div className={styles.infoItem}>
                        <strong>Analysis ID:</strong> {analysis.analysisId}
                      </div>
                      <div className={styles.infoItem}>
                        <strong>Analysis Generated:</strong> {new Date(analysis.analysisTimestamp).toLocaleString()}
                      </div>
                    </>
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ExperimentDetails