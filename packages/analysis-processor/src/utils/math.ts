/**
 * Mathematical utility functions for statistical analysis
 */

/**
 * Calculate mean of an array of numbers
 */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calculate standard deviation of an array of numbers
 */
export function standardDeviation(values: number[]): number {
  if (values.length <= 1) return 0;
  
  const avg = mean(values);
  const squaredDiffs = values.map(val => Math.pow(val - avg, 2));
  const variance = mean(squaredDiffs);
  return Math.sqrt(variance);
}

/**
 * Calculate standard error of the mean
 */
export function standardError(values: number[]): number {
  if (values.length <= 1) return 0;
  return standardDeviation(values) / Math.sqrt(values.length);
}

/**
 * Calculate Cohen's d effect size
 */
export function cohensD(treatment: number[], control: number[]): number {
  if (treatment.length === 0 || control.length === 0) return 0;
  
  const meanTreatment = mean(treatment);
  const meanControl = mean(control);
  
  const sdTreatment = standardDeviation(treatment);
  const sdControl = standardDeviation(control);
  
  // Pooled standard deviation
  const pooledSD = Math.sqrt(
    ((treatment.length - 1) * Math.pow(sdTreatment, 2) + 
     (control.length - 1) * Math.pow(sdControl, 2)) /
    (treatment.length + control.length - 2)
  );
  
  if (pooledSD === 0) return 0;
  return (meanTreatment - meanControl) / pooledSD;
}

/**
 * Calculate degrees of freedom for t-test
 */
export function degreesOfFreedom(n1: number, n2: number): number {
  return n1 + n2 - 2;
}

/**
 * Calculate t-statistic for independent samples t-test
 */
export function tStatistic(treatment: number[], control: number[]): number {
  if (treatment.length === 0 || control.length === 0) return 0;
  
  const meanTreatment = mean(treatment);
  const meanControl = mean(control);
  const seTreatment = standardError(treatment);
  const seControl = standardError(control);
  
  const standardErrorDiff = Math.sqrt(Math.pow(seTreatment, 2) + Math.pow(seControl, 2));
  
  if (standardErrorDiff === 0) return 0;
  return (meanTreatment - meanControl) / standardErrorDiff;
}

/**
 * Approximate p-value calculation for t-test (two-tailed)
 * Uses Student's t-distribution approximation
 */
export function approximatePValue(tStat: number, df: number): number {
  if (df <= 0) return 1;
  
  const absTStat = Math.abs(tStat);
  
  // Simple approximation for p-value
  // For more accurate results, would use a proper t-distribution library
  if (absTStat >= 2.576) return 0.01;   // 99% confidence
  if (absTStat >= 1.96) return 0.05;    // 95% confidence
  if (absTStat >= 1.645) return 0.1;    // 90% confidence
  if (absTStat >= 1.282) return 0.2;    // 80% confidence
  return 0.5; // Not significant
}

/**
 * Calculate confidence interval for mean difference
 */
export function confidenceInterval(
  meanDiff: number, 
  standardError: number, 
  confidenceLevel = 95
): { lower: number; upper: number } {
  // Critical values for common confidence levels
  const criticalValues: { [key: number]: number } = {
    90: 1.645,
    95: 1.96,
    99: 2.576
  };
  
  const criticalValue = criticalValues[confidenceLevel] || 1.96;
  const marginOfError = criticalValue * standardError;
  
  return {
    lower: meanDiff - marginOfError,
    upper: meanDiff + marginOfError
  };
}