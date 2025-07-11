import { TimeSeriesPoint, MetricSummary } from '@rallyuxr/shared';

export interface SimulationParameters {
  baseConversionRate: number;
  treatmentEffect: number; // Relative change (+0.1 = 10% improvement)
  dailyVariance: number;
  sampleSizeRange: {
    min: number;
    max: number;
  };
  seasonalityFactor?: number;
  trendFactor?: number;
}

export interface GenerationRequest {
  experimentId: string;
  metricId: string;
  startDate: string;
  endDate: string;
  parameters: SimulationParameters;
}

/**
 * Generate realistic time-series data points for A/B testing with parameterized controls
 */
export function generateTimeSeriesData(request: GenerationRequest): TimeSeriesPoint[] {
  const { startDate, endDate, parameters } = request;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalHours = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60));
  
  const dataPoints: TimeSeriesPoint[] = [];
  
  for (let hour = 0; hour < totalHours; hour++) {
    const timestamp = new Date(start.getTime() + hour * 60 * 60 * 1000);
    
    // Generate sample sizes with realistic variation
    const treatmentSampleSize = generateSampleSize(parameters.sampleSizeRange, hour, totalHours);
    const controlSampleSize = generateSampleSize(parameters.sampleSizeRange, hour, totalHours);
    
    // Generate conversion values with treatment effect
    const controlValue = generateMetricValue(
      parameters.baseConversionRate,
      parameters.dailyVariance,
      hour,
      totalHours,
      parameters.seasonalityFactor,
      parameters.trendFactor
    );
    
    const treatmentValue = generateMetricValue(
      parameters.baseConversionRate * (1 + parameters.treatmentEffect),
      parameters.dailyVariance,
      hour,
      totalHours,
      parameters.seasonalityFactor,
      parameters.trendFactor
    );
    
    dataPoints.push({
      timestamp: timestamp.toISOString(),
      treatmentValue,
      controlValue,
      treatmentSampleSize,
      controlSampleSize
    });
  }
  
  return dataPoints;
}

/**
 * Calculate summary statistics from time series data
 */
export function calculateSummary(timeSeries: TimeSeriesPoint[]): MetricSummary {
  const treatmentValues = timeSeries.map(point => point.treatmentValue);
  const controlValues = timeSeries.map(point => point.controlValue);
  
  const treatmentMean = treatmentValues.reduce((sum, val) => sum + val, 0) / treatmentValues.length;
  const controlMean = controlValues.reduce((sum, val) => sum + val, 0) / controlValues.length;
  
  const totalTreatmentSamples = timeSeries.reduce((sum, point) => sum + point.treatmentSampleSize, 0);
  const totalControlSamples = timeSeries.reduce((sum, point) => sum + point.controlSampleSize, 0);
  
  return {
    treatmentMean,
    controlMean,
    totalTreatmentSamples,
    totalControlSamples
  };
}

/**
 * Generate realistic sample sizes with time-based variation
 */
function generateSampleSize(
  range: { min: number; max: number },
  hour: number,
  totalHours: number
): number {
  // Add some daily cyclical variation (lower at night/early morning)
  const hourOfDay = hour % 24;
  const dailyFactor = 0.3 + 0.7 * Math.sin((hourOfDay - 6) * Math.PI / 12); // Peak around 6 PM
  
  // Add some random variation
  const randomFactor = 0.8 + 0.4 * Math.random(); // 20% base variation
  
  const baseSize = range.min + (range.max - range.min) * dailyFactor * randomFactor;
  return Math.max(range.min, Math.round(baseSize));
}

/**
 * Generate metric values with realistic variation and optional trends/seasonality
 */
function generateMetricValue(
  baseRate: number,
  variance: number,
  hour: number,
  totalHours: number,
  seasonalityFactor = 0,
  trendFactor = 0
): number {
  // Base random variation
  const randomVariation = (Math.random() - 0.5) * variance;
  
  // Optional seasonal component (weekly cycle)
  const dayOfWeek = Math.floor(hour / 24) % 7;
  const seasonalVariation = seasonalityFactor * Math.sin(dayOfWeek * 2 * Math.PI / 7);
  
  // Optional trend component (linear change over experiment period)
  const trendVariation = trendFactor * (hour / totalHours);
  
  const finalValue = baseRate + randomVariation + seasonalVariation + trendVariation;
  
  // Ensure value stays within reasonable bounds (0 to 1 for conversion rates)
  return Math.max(0, Math.min(1, finalValue));
}