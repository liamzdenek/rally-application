/**
 * Differences-in-Differences (DiD) analysis implementation
 */

import { ExperimentResult, TimeSeriesPoint, DidMetricResult } from '../../../shared/src/types';
import { calculateDidAnalysis, validateDidRequirements, isStatisticallySignificant, interpretEffectSize } from '../utils/statistics';

export interface DidAnalysisOptions {
  confidenceLevel?: number;
  minimumSampleSize?: number;
  alpha?: number;
}

/**
 * Perform DiD analysis for all metrics in an experiment result
 */
export function performDidAnalysis(
  experimentResult: ExperimentResult,
  options: DidAnalysisOptions = {}
): { [metricId: string]: DidMetricResult } {
  const {
    confidenceLevel = 95,
    minimumSampleSize = 10,
    alpha = 0.05
  } = options;

  console.log(`Starting DiD analysis for experiment ${experimentResult.experimentId}`);
  console.log(`Analyzing ${Object.keys(experimentResult.metrics).length} metrics`);

  const results: { [metricId: string]: DidMetricResult } = {};

  // Process each metric
  for (const [metricId, metricData] of Object.entries(experimentResult.metrics)) {
    console.log(`Processing metric: ${metricId}`);
    
    try {
      // Validate data quality
      const validation = validateDidRequirements(metricData.timeSeries);
      if (!validation.isValid) {
        console.warn(`Skipping metric ${metricId} due to validation errors:`, validation.errors);
        continue;
      }

      // Perform DiD calculation
      const didResult = calculateDidAnalysis(metricData.timeSeries, confidenceLevel);
      
      // Check if we have sufficient sample size
      if (didResult.sampleSizeTreatment < minimumSampleSize || 
          didResult.sampleSizeControl < minimumSampleSize) {
        console.warn(`Skipping metric ${metricId} due to insufficient sample size`);
        continue;
      }

      // Store results
      results[metricId] = {
        treatmentMean: didResult.treatmentMean,
        controlMean: didResult.controlMean,
        absoluteDifference: didResult.absoluteDifference,
        relativeDifference: didResult.relativeDifference,
        pValue: didResult.pValue,
        confidenceLevel: didResult.confidenceLevel,
        confidenceInterval: didResult.confidenceInterval,
        sampleSizeControl: didResult.sampleSizeControl,
        sampleSizeTreatment: didResult.sampleSizeTreatment,
        effectSize: didResult.effectSize
      };

      console.log(`Metric ${metricId}: diff=${didResult.absoluteDifference.toFixed(4)}, p=${didResult.pValue.toFixed(4)}, significant=${isStatisticallySignificant(didResult.pValue, alpha)}, effect=${interpretEffectSize(didResult.effectSize)}`);
      
    } catch (error) {
      console.error(`Error analyzing metric ${metricId}:`, error);
      continue;
    }
  }

  console.log(`DiD analysis complete. Successfully analyzed ${Object.keys(results).length} metrics`);
  return results;
}

/**
 * Calculate aggregate statistics across all metrics
 */
export function calculateAggregateStatistics(didResults: { [metricId: string]: DidMetricResult }): {
  totalMetrics: number;
  significantMetrics: number;
  averageEffectSize: number;
  strongestEffect: { metricId: string; effectSize: number } | null;
  overallSignificance: boolean;
} {
  const metricIds = Object.keys(didResults);
  
  if (metricIds.length === 0) {
    return {
      totalMetrics: 0,
      significantMetrics: 0,
      averageEffectSize: 0,
      strongestEffect: null,
      overallSignificance: false
    };
  }

  let significantCount = 0;
  let totalEffectSize = 0;
  let strongestEffect: { metricId: string; effectSize: number } | null = null;

  for (const [metricId, result] of Object.entries(didResults)) {
    if (isStatisticallySignificant(result.pValue)) {
      significantCount++;
    }
    
    totalEffectSize += Math.abs(result.effectSize);
    
    if (!strongestEffect || Math.abs(result.effectSize) > Math.abs(strongestEffect.effectSize)) {
      strongestEffect = { metricId, effectSize: result.effectSize };
    }
  }

  return {
    totalMetrics: metricIds.length,
    significantMetrics: significantCount,
    averageEffectSize: totalEffectSize / metricIds.length,
    strongestEffect,
    overallSignificance: significantCount > 0
  };
}

/**
 * Generate summary insights from DiD analysis
 */
export function generateDidInsights(
  didResults: { [metricId: string]: DidMetricResult },
  experimentPeriod: { startDate: string; endDate: string; durationDays: number }
): string[] {
  const insights: string[] = [];
  const stats = calculateAggregateStatistics(didResults);
  
  // Overall experiment insights
  if (stats.overallSignificance) {
    insights.push(`Experiment shows statistically significant results in ${stats.significantMetrics} out of ${stats.totalMetrics} metrics`);
  } else {
    insights.push(`Experiment did not achieve statistical significance in any of the ${stats.totalMetrics} measured metrics`);
  }

  // Effect size insights
  if (stats.averageEffectSize > 0.8) {
    insights.push(`Large average effect size (${stats.averageEffectSize.toFixed(2)}) indicates strong treatment impact`);
  } else if (stats.averageEffectSize > 0.5) {
    insights.push(`Medium average effect size (${stats.averageEffectSize.toFixed(2)}) indicates moderate treatment impact`);
  } else if (stats.averageEffectSize > 0.2) {
    insights.push(`Small average effect size (${stats.averageEffectSize.toFixed(2)}) indicates minimal treatment impact`);
  } else {
    insights.push(`Negligible average effect size (${stats.averageEffectSize.toFixed(2)}) indicates little to no treatment impact`);
  }

  // Strongest effect insight
  if (stats.strongestEffect) {
    const interpretation = interpretEffectSize(stats.strongestEffect.effectSize);
    insights.push(`Strongest effect observed in metric '${stats.strongestEffect.metricId}' with ${interpretation} effect size (${stats.strongestEffect.effectSize.toFixed(2)})`);
  }

  // Time-based insights
  if (experimentPeriod.durationDays < 7) {
    insights.push(`Short experiment duration (${experimentPeriod.durationDays} days) may limit reliability of results`);
  } else if (experimentPeriod.durationDays > 30) {
    insights.push(`Extended experiment duration (${experimentPeriod.durationDays} days) provides robust data for analysis`);
  }

  // Metric-specific insights
  for (const [metricId, result] of Object.entries(didResults)) {
    if (isStatisticallySignificant(result.pValue)) {
      const direction = result.absoluteDifference > 0 ? 'positive' : 'negative';
      const magnitude = Math.abs(result.relativeDifference * 100).toFixed(1);
      insights.push(`Metric '${metricId}' shows ${direction} ${magnitude}% change with ${result.confidenceLevel}% confidence`);
    }
  }

  return insights;
}