import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, ResponsiveContainer, AreaChart, Area } from 'recharts'
import styles from './Charts.module.css'

interface ChartDataPoint {
  timestamp: string
  control?: number
  treatment?: number
  [key: string]: any
}

interface LineChartProps {
  data: ChartDataPoint[]
  title: string
  yAxisLabel?: string
  showTrend?: boolean
  height?: number
}

interface BarChartProps {
  data: ChartDataPoint[]
  title: string
  yAxisLabel?: string
  height?: number
}

interface AreaChartProps {
  data: ChartDataPoint[]
  title: string
  yAxisLabel?: string
  height?: number
}

export function TimeSeriesLineChart({ data, title, yAxisLabel, showTrend = true, height = 300 }: LineChartProps) {
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatTooltipValue = (value: number, name: string) => {
    if (typeof value === 'number') {
      return [value.toFixed(2), name === 'control' ? 'Control' : 'Treatment']
    }
    return [value, name]
  }

  return (
    <div className={styles.chartContainer}>
      <h4 className={styles.chartTitle}>{title}</h4>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={formatTimestamp}
            stroke="#000"
            fontSize={12}
          />
          <YAxis 
            label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }}
            stroke="#000"
            fontSize={12}
          />
          <Tooltip 
            formatter={formatTooltipValue}
            labelFormatter={(label) => `Time: ${formatTimestamp(label)}`}
            contentStyle={{
              border: '3px solid #000',
              background: '#fff',
              borderRadius: 0
            }}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="control" 
            stroke="#6c757d" 
            strokeWidth={3}
            name="Control"
            dot={{ fill: '#6c757d', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#6c757d', strokeWidth: 2 }}
          />
          <Line 
            type="monotone" 
            dataKey="treatment" 
            stroke="#007bff" 
            strokeWidth={3}
            name="Treatment"
            dot={{ fill: '#007bff', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#007bff', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ComparisonBarChart({ data, title, yAxisLabel, height = 300 }: BarChartProps) {
  return (
    <div className={styles.chartContainer}>
      <h4 className={styles.chartTitle}>{title}</h4>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
          <XAxis 
            dataKey="timestamp" 
            stroke="#000"
            fontSize={12}
          />
          <YAxis 
            label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }}
            stroke="#000"
            fontSize={12}
          />
          <Tooltip 
            contentStyle={{
              border: '3px solid #000',
              background: '#fff',
              borderRadius: 0
            }}
          />
          <Legend />
          <Bar 
            dataKey="control" 
            fill="#6c757d" 
            stroke="#000"
            strokeWidth={2}
            name="Control"
          />
          <Bar 
            dataKey="treatment" 
            fill="#007bff" 
            stroke="#000"
            strokeWidth={2}
            name="Treatment"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function TrendAreaChart({ data, title, yAxisLabel, height = 300 }: AreaChartProps) {
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    })
  }

  return (
    <div className={styles.chartContainer}>
      <h4 className={styles.chartTitle}>{title}</h4>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={formatTimestamp}
            stroke="#000"
            fontSize={12}
          />
          <YAxis 
            label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }}
            stroke="#000"
            fontSize={12}
          />
          <Tooltip 
            labelFormatter={(label) => `Date: ${formatTimestamp(label)}`}
            contentStyle={{
              border: '3px solid #000',
              background: '#fff',
              borderRadius: 0
            }}
          />
          <Legend />
          <Area 
            type="monotone" 
            dataKey="control" 
            stackId="1"
            stroke="#6c757d" 
            fill="#6c757d"
            fillOpacity={0.3}
            strokeWidth={2}
            name="Control"
          />
          <Area 
            type="monotone" 
            dataKey="treatment" 
            stackId="2"
            stroke="#007bff" 
            fill="#007bff"
            fillOpacity={0.3}
            strokeWidth={2}
            name="Treatment"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

interface MetricComparisonProps {
  controlValue: number
  treatmentValue: number
  metricName: string
  unit: string
  confidenceLevel?: number
}

export function MetricComparison({ controlValue, treatmentValue, metricName, unit, confidenceLevel }: MetricComparisonProps) {
  const difference = treatmentValue - controlValue
  const percentChange = controlValue !== 0 ? (difference / controlValue) * 100 : 0
  const isPositive = difference > 0
  const isSignificant = confidenceLevel && confidenceLevel > 95

  return (
    <div className={styles.metricComparison}>
      <div className={styles.metricHeader}>
        <h4>{metricName}</h4>
        {confidenceLevel && (
          <span className={`${styles.confidence} ${isSignificant ? styles.significant : ''}`}>
            {confidenceLevel.toFixed(1)}% confidence
          </span>
        )}
      </div>
      
      <div className={styles.metricValues}>
        <div className={styles.valueGroup}>
          <span className={styles.label}>Control</span>
          <span className={styles.value}>{controlValue.toFixed(2)} {unit}</span>
        </div>
        <div className={styles.valueGroup}>
          <span className={styles.label}>Treatment</span>
          <span className={styles.value}>{treatmentValue.toFixed(2)} {unit}</span>
        </div>
      </div>
      
      <div className={styles.difference}>
        <span className={`${styles.changeValue} ${isPositive ? styles.positive : styles.negative}`}>
          {isPositive ? '+' : ''}{difference.toFixed(2)} {unit}
        </span>
        <span className={`${styles.changePercent} ${isPositive ? styles.positive : styles.negative}`}>
          ({isPositive ? '+' : ''}{percentChange.toFixed(1)}%)
        </span>
      </div>
    </div>
  )
}

export function ChartGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.chartGrid}>
      {children}
    </div>
  )
}