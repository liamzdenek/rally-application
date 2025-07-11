/**
 * Statistical analysis utilities for Differences-in-Differences (DiD) analysis
 */

import { mean, standardDeviation, standardError, cohensD, tStatistic, degreesOfFreedom, approximatePValue, confidenceInterval } from './math';
import { TimeSeriesPoint } from '../../../shared/src/types/results';

export interface DidCalculationInput {
  treatmentValues: number[];
  controlValues: number[];
  treatmentSampleSizes: number[];
  controlSampleSizes: number[];
}

export interface DidResult {
  treatmentMean: number;
  controlMean: number;
  absoluteDifference: number;
  relativeDifference: number;
  pValue: number;
  confidenceLevel: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  sampleSizeControl: number;
  sampleSizeTreatment: number;
  effectSize: number;
}

/**
 * Perform Differences-in-Differences analysis on time series data
 */
export function calculateDidAnalysis(
  timeSeries: TimeSeriesPoint[],
  confidenceLevel = 95
): DidResult {
  console.log(`Starting DiD analysis for ${timeSeries.length} data points`);
  
  if (timeSeries.length === 0) {
    throw new Error('Cannot perform DiD analysis on empty time series');
  }

  // Extract treatment and control values
  const treatmentValues = timeSeries.map(point => point.treatmentValue);
  const controlValues = timeSeries.map(point => point.controlValue);
  
  // Calculate basic statistics
  const treatmentMean = mean(treatmentValues);
  const controlMean = mean(controlValues);
  const absoluteDifference = treatmentMean - controlMean;
  const relativeDifference = controlMean !== 0 ? absoluteDifference / controlMean : 0;
  
  // Calculate sample sizes (total across all time points)
  const sampleSizeTreatment = timeSeries.reduce((sum, point) => sum + point.treatmentSampleSize, 0);
  const sampleSizeControl = timeSeries.reduce((sum, point) => sum + point.controlSampleSize, 0);
  
  // Calculate statistical significance
  const tStat = tStatistic(treatmentValues, controlValues);
  const df = degreesOfFreedom(treatmentValues.length, controlValues.length);
  const pValue = approximatePValue(tStat, df);
  
  // Calculate effect size (Cohen's d)
  const effectSize = cohensD(treatmentValues, controlValues);
  
  // Calculate confidence interval
  const treatmentSE = standardError(treatmentValues);
  const controlSE = standardError(controlValues);
  const combinedSE = Math.sqrt(Math.pow(treatmentSE, 2) + Math.pow(controlSE, 2));
  const ci = confidenceInterval(absoluteDifference, combinedSE, confidenceLevel);
  
  console.log(`DiD analysis complete: treatment=${treatmentMean.toFixed(4)}, control=${controlMean.toFixed(4)}, diff=${absoluteDifference.toFixed(4)}, p=${pValue.toFixed(4)}`);
  
  return {
    treatmentMean,
    controlMean,
    absoluteDifference,
    relativeDifference,
    pValue,
    confidenceLevel,
    confidenceInterval: ci,
    sampleSizeControl,
    sampleSizeTreatment,
    effectSize
  };
}

/**
 * Determine if results are statistically significant
 */
export function isStatisticallySignificant(pValue: number, alpha = 0.05): boolean {
  return pValue < alpha;
}

/**
 * Interpret effect size based on Cohen's d
 */
export function interpretEffectSize(cohensD: number): string {
  const absD = Math.abs(cohensD);
  
  if (absD < 0.2) return 'negligible';
  if (absD < 0.5) return 'small';
  if (absD < 0.8) return 'medium';
  return 'large';
}

/**
 * Calculate statistical power (simplified estimation)
 */
export function estimateStatisticalPower(
  effectSize: number,
  sampleSize: number,
  alpha = 0.05
): number {
  // Simplified power calculation
  // In practice, would use more sophisticated methods
  const z_alpha = 1.96; // for alpha = 0.05
  const z_beta = Math.sqrt(sampleSize) * Math.abs(effectSize) - z_alpha;
  
  // Approximate power using normal distribution
  if (z_beta <= -3) return 0.001;
  if (z_beta <= -2) return 0.025;
  if (z_beta <= -1) return 0.16;
  if (z_beta <= 0) return 0.5;
  if (z_beta <= 1) return 0.84;
  if (z_beta <= 2) return 0.975;
  return 0.999;
}

/**
 * Validate DiD analysis requirements
 */
export function validateDidRequirements(timeSeries: TimeSeriesPoint[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (timeSeries.length === 0) {
    errors.push('Time series data is empty');
  }
  
  if (timeSeries.length < 2) {
    errors.push('Need at least 2 data points for meaningful analysis');
  }
  
  // Check for missing or invalid data
  timeSeries.forEach((point, index) => {
    if (isNaN(point.treatmentValue) || isNaN(point.controlValue)) {
      errors.push(`Invalid values at time point ${index}`);
    }
    
    if (point.treatmentSampleSize <= 0 || point.controlSampleSize <= 0) {
      errors.push(`Invalid sample sizes at time point ${index}`);
    }
  });
  
  // Check for sufficient sample sizes
  const totalTreatmentSamples = timeSeries.reduce((sum, point) => sum + point.treatmentSampleSize, 0);
  const totalControlSamples = timeSeries.reduce((sum, point) => sum + point.controlSampleSize, 0);
  
  if (totalTreatmentSamples < 10) {
    errors.push('Treatment group sample size too small (< 10)');
  }
  
  if (totalControlSamples < 10) {
    errors.push('Control group sample size too small (< 10)');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}