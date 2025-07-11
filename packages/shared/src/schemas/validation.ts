import { z } from 'zod';

// Experiment schemas
export const ExperimentDefinitionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().max(1000),
  status: z.enum(['draft', 'running', 'complete', 'archived']),
  metrics: z.array(z.string()).min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  expectedOutcome: z.enum(['positive', 'negative', 'neutral']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  createdBy: z.string().optional(),
}).refine(data => {
  // Validate that end date is after start date
  return new Date(data.endDate) > new Date(data.startDate);
}, {
  message: "End date must be after start date",
  path: ["endDate"]
});

export const CreateExperimentSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000),
  metrics: z.array(z.string()).min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  expectedOutcome: z.enum(['positive', 'negative', 'neutral']),
}).refine(data => {
  // Validate that end date is after start date
  return new Date(data.endDate) > new Date(data.startDate);
}, {
  message: "End date must be after start date",
  path: ["endDate"]
});

// Results schemas
export const TimeSeriesPointSchema = z.object({
  timestamp: z.string().datetime(),
  treatmentValue: z.number(),
  controlValue: z.number(),
  treatmentSampleSize: z.number().int().min(0),
  controlSampleSize: z.number().int().min(0),
});

export const MetricSummarySchema = z.object({
  treatmentMean: z.number(),
  controlMean: z.number(),
  totalTreatmentSamples: z.number().int().min(0),
  totalControlSamples: z.number().int().min(0),
});

export const ExperimentPeriodSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  totalHours: z.number().int().min(0),
}).refine(data => {
  return new Date(data.endDate) > new Date(data.startDate);
}, {
  message: "End date must be after start date",
  path: ["endDate"]
});

export const ExperimentResultSchema = z.object({
  experimentId: z.string().uuid(),
  metrics: z.record(z.string(), z.object({
    timeSeries: z.array(TimeSeriesPointSchema),
    summary: MetricSummarySchema,
  })),
  generatedAt: z.string().datetime(),
  experimentPeriod: ExperimentPeriodSchema,
});

// Analysis schemas
export const ConfidenceIntervalSchema = z.object({
  lower: z.number(),
  upper: z.number(),
}).refine(data => {
  return data.upper > data.lower;
}, {
  message: "Upper confidence interval bound must be greater than lower bound",
  path: ["upper"]
});

export const DidMetricResultSchema = z.object({
  treatmentMean: z.number(),
  controlMean: z.number(),
  absoluteDifference: z.number(),
  relativeDifference: z.number(),
  pValue: z.number().min(0).max(1),
  confidenceLevel: z.number().min(0).max(100),
  confidenceInterval: ConfidenceIntervalSchema,
  sampleSizeControl: z.number().int().min(0),
  sampleSizeTreatment: z.number().int().min(0),
  effectSize: z.number(),
});

export const EconomicImpactSchema = z.object({
  totalImpact: z.number(),
  annualizedImpact: z.number(),
  roiPercentage: z.number(),
  metricBreakdown: z.record(z.string(), z.object({
    dollarImpact: z.number(),
    metricValueUsed: z.number(),
    metricChange: z.number(),
  })),
});

export const MetricValueSnapshotSchema = z.object({
  dollarsPerUnit: z.number(),
  description: z.string(),
  unit: z.string(),
});

export const AnalysisPeriodSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  durationDays: z.number().int().min(0),
}).refine(data => {
  return new Date(data.endDate) > new Date(data.startDate);
}, {
  message: "End date must be after start date",
  path: ["endDate"]
});

export const ExperimentAnalysisSchema = z.object({
  experimentId: z.string().uuid(),
  analysisId: z.string().uuid(),
  didResults: z.record(z.string(), DidMetricResultSchema),
  economicImpact: EconomicImpactSchema,
  metricValuesSnapshot: z.record(z.string(), MetricValueSnapshotSchema),
  analysisTimestamp: z.string().datetime(),
  experimentPeriod: AnalysisPeriodSchema,
  status: z.enum(['processing', 'complete', 'failed']),
  version: z.string().min(1),
});

// Metrics schemas
export const ValidationRulesSchema = z.object({
  minValue: z.number().optional(),
  maxValue: z.number().optional(),
  decimalPlaces: z.number().int().min(0).optional(),
}).refine(data => {
  // Max value should be greater than min value if both are provided
  if (data.minValue !== undefined && data.maxValue !== undefined) {
    return data.maxValue > data.minValue;
  }
  return true;
}, {
  message: "Maximum value must be greater than minimum value",
  path: ["maxValue"]
});

export const MetricValueSchema = z.object({
  metricId: z.string().min(1),
  dollarsPerUnit: z.number(),
  unit: z.string().min(1),
  name: z.string().min(1).max(255),
  description: z.string().max(1000),
  category: z.enum(['conversion', 'revenue', 'engagement', 'retention', 'other']),
  lastUpdated: z.string().datetime(),
  updatedBy: z.string().optional(),
  version: z.number().int().min(1),
  validationRules: ValidationRulesSchema.optional(),
});