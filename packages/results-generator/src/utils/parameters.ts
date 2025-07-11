import { z } from 'zod';

/**
 * Schema for simulation parameters that Claude will provide
 */
export const SimulationParametersSchema = z.object({
  baseConversionRate: z.number().min(0).max(1000), // Allow both rates (0-1) and revenue values
  treatmentEffect: z.number().min(-1).max(1), // Relative change
  dailyVariance: z.number().min(0).max(100), // Absolute variance
  sampleSizeRange: z.object({
    min: z.number().int().min(1),
    max: z.number().int().min(1)
  }),
  seasonalityFactor: z.number().min(0).max(1).optional(),
  trendFactor: z.number().min(-1).max(1).optional()
});

export type SimulationParametersType = z.infer<typeof SimulationParametersSchema>;

/**
 * Schema for metric type definitions
 */
export const MetricTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['conversion_rate', 'revenue_per_user', 'bounce_rate', 'time_on_page', 'click_through_rate']),
  description: z.string().optional()
});

export type MetricType = z.infer<typeof MetricTypeSchema>;

/**
 * Default metric types for common UX metrics
 */
export const DEFAULT_METRIC_TYPES: { [key: string]: MetricType } = {
  'conversion_rate': {
    id: 'conversion_rate',
    name: 'Conversion Rate',
    type: 'conversion_rate',
    description: 'Percentage of users who complete the primary action'
  },
  'revenue_per_user': {
    id: 'revenue_per_user',
    name: 'Revenue Per User',
    type: 'revenue_per_user',
    description: 'Average revenue generated per user'
  },
  'bounce_rate': {
    id: 'bounce_rate',
    name: 'Bounce Rate',
    type: 'bounce_rate',
    description: 'Percentage of users who leave after viewing only one page'
  },
  'time_on_page': {
    id: 'time_on_page',
    name: 'Time on Page',
    type: 'time_on_page',
    description: 'Average time users spend on the page (in seconds)'
  },
  'click_through_rate': {
    id: 'click_through_rate',
    name: 'Click Through Rate',
    type: 'click_through_rate',
    description: 'Percentage of users who click on a specific element'
  }
};

/**
 * Get metric type information, with fallback to reasonable defaults
 */
export function getMetricType(metricId: string): MetricType {
  // Check if it's a known metric type
  if (DEFAULT_METRIC_TYPES[metricId]) {
    return DEFAULT_METRIC_TYPES[metricId];
  }
  
  // Try to infer type from metric ID
  const lowerId = metricId.toLowerCase();
  
  if (lowerId.includes('conversion') || lowerId.includes('rate')) {
    return {
      id: metricId,
      name: metricId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      type: 'conversion_rate',
      description: `Custom conversion rate metric: ${metricId}`
    };
  }
  
  if (lowerId.includes('revenue') || lowerId.includes('dollar') || lowerId.includes('money')) {
    return {
      id: metricId,
      name: metricId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      type: 'revenue_per_user',
      description: `Custom revenue metric: ${metricId}`
    };
  }
  
  if (lowerId.includes('bounce')) {
    return {
      id: metricId,
      name: metricId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      type: 'bounce_rate',
      description: `Custom bounce rate metric: ${metricId}`
    };
  }
  
  if (lowerId.includes('time') || lowerId.includes('duration')) {
    return {
      id: metricId,
      name: metricId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      type: 'time_on_page',
      description: `Custom time metric: ${metricId}`
    };
  }
  
  // Default to conversion rate
  return {
    id: metricId,
    name: metricId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    type: 'conversion_rate',
    description: `Custom metric: ${metricId}`
  };
}

/**
 * Get reasonable default parameters for a metric type
 */
export function getDefaultParameters(metricType: MetricType['type']): SimulationParametersType {
  switch (metricType) {
    case 'conversion_rate':
    case 'click_through_rate':
      return {
        baseConversionRate: 0.05, // 5%
        treatmentEffect: 0.1, // 10% improvement
        dailyVariance: 0.01,
        sampleSizeRange: { min: 1000, max: 5000 },
        seasonalityFactor: 0.1,
        trendFactor: 0
      };
      
    case 'revenue_per_user':
      return {
        baseConversionRate: 25.0, // $25 per user
        treatmentEffect: 0.15, // 15% improvement
        dailyVariance: 5.0,
        sampleSizeRange: { min: 500, max: 2000 },
        seasonalityFactor: 0.15,
        trendFactor: 0
      };
      
    case 'bounce_rate':
      return {
        baseConversionRate: 0.35, // 35% bounce rate
        treatmentEffect: -0.1, // 10% reduction (improvement)
        dailyVariance: 0.05,
        sampleSizeRange: { min: 800, max: 4000 },
        seasonalityFactor: 0.08,
        trendFactor: 0
      };
      
    case 'time_on_page':
      return {
        baseConversionRate: 120, // 120 seconds
        treatmentEffect: 0.2, // 20% improvement
        dailyVariance: 20,
        sampleSizeRange: { min: 600, max: 3000 },
        seasonalityFactor: 0.12,
        trendFactor: 0
      };
      
    default:
      return {
        baseConversionRate: 0.08,
        treatmentEffect: 0.1,
        dailyVariance: 0.02,
        sampleSizeRange: { min: 1000, max: 3000 },
        seasonalityFactor: 0.05,
        trendFactor: 0
      };
  }
}