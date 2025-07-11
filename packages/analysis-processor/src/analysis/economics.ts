/**
 * Economic impact calculations for experiment analysis
 */

import { DidMetricResult, EconomicImpact, MetricValueSnapshot } from '../../../shared/src/types';

export interface EconomicCalculationOptions {
  annualizationFactor?: number; // Default 365 for daily experiments
  confidenceLevel?: number;
  includeOnlySignificant?: boolean;
}

/**
 * Calculate economic impact from DiD analysis results
 */
export function calculateEconomicImpact(
  didResults: { [metricId: string]: DidMetricResult },
  metricValues: { [metricId: string]: MetricValueSnapshot },
  experimentDurationDays: number,
  options: EconomicCalculationOptions = {}
): EconomicImpact {
  const {
    annualizationFactor = 365,
    confidenceLevel = 95,
    includeOnlySignificant = false
  } = options;

  console.log(`Calculating economic impact for ${Object.keys(didResults).length} metrics`);
  console.log(`Experiment duration: ${experimentDurationDays} days, annualization factor: ${annualizationFactor}`);

  const metricBreakdown: { [metricId: string]: { dollarImpact: number; metricValueUsed: number; metricChange: number } } = {};
  let totalImpact = 0;

  // Calculate impact for each metric
  for (const [metricId, didResult] of Object.entries(didResults)) {
    const metricValue = metricValues[metricId];
    
    if (!metricValue) {
      console.warn(`No metric value found for ${metricId}, skipping economic calculation`);
      continue;
    }

    // Skip non-significant results if requested
    if (includeOnlySignificant && didResult.pValue >= 0.05) {
      console.log(`Skipping non-significant metric ${metricId} (p=${didResult.pValue.toFixed(4)})`);
      continue;
    }

    // Calculate daily dollar impact
    const metricChange = didResult.absoluteDifference;
    const dollarsPerUnit = metricValue.dollarsPerUnit;
    const dailyDollarImpact = metricChange * dollarsPerUnit;
    
    // Store breakdown
    metricBreakdown[metricId] = {
      dollarImpact: dailyDollarImpact,
      metricValueUsed: dollarsPerUnit,
      metricChange: metricChange
    };

    totalImpact += dailyDollarImpact;

    console.log(`Metric ${metricId}: change=${metricChange.toFixed(4)}, value=$${dollarsPerUnit}/unit, daily impact=$${dailyDollarImpact.toFixed(2)}`);
  }

  // Calculate annualized impact
  const annualizedImpact = totalImpact * (annualizationFactor / experimentDurationDays);
  
  // Calculate ROI (simplified - would need experiment cost data for accurate calculation)
  // For now, assume positive impact = positive ROI
  const roiPercentage = totalImpact > 0 ? 
    Math.min(totalImpact * 100, 1000) : // Cap at 1000% for sanity
    Math.max(totalImpact * 100, -100);  // Floor at -100% for bankruptcy protection

  console.log(`Economic impact calculation complete:`);
  console.log(`  Total daily impact: $${totalImpact.toFixed(2)}`);
  console.log(`  Annualized impact: $${annualizedImpact.toFixed(2)}`);
  console.log(`  Estimated ROI: ${roiPercentage.toFixed(1)}%`);

  return {
    totalImpact,
    annualizedImpact,
    roiPercentage,
    metricBreakdown
  };
}

/**
 * Generate economic insights and recommendations
 */
export function generateEconomicInsights(
  economicImpact: EconomicImpact,
  experimentDurationDays: number
): string[] {
  const insights: string[] = [];
  
  // Overall impact assessment
  if (economicImpact.totalImpact > 0) {
    insights.push(`Positive economic impact of $${economicImpact.totalImpact.toFixed(2)} per day`);
    
    if (economicImpact.annualizedImpact > 10000) {
      insights.push(`Strong annualized value of $${economicImpact.annualizedImpact.toLocaleString()} suggests high-value optimization`);
    } else if (economicImpact.annualizedImpact > 1000) {
      insights.push(`Moderate annualized value of $${economicImpact.annualizedImpact.toLocaleString()} justifies implementation`);
    } else {
      insights.push(`Limited annualized value of $${economicImpact.annualizedImpact.toLocaleString()} may not justify implementation costs`);
    }
  } else if (economicImpact.totalImpact < 0) {
    insights.push(`Negative economic impact of $${Math.abs(economicImpact.totalImpact).toFixed(2)} per day - treatment reduces value`);
    insights.push(`Projected annual loss of $${Math.abs(economicImpact.annualizedImpact).toLocaleString()} suggests avoiding this change`);
  } else {
    insights.push(`Neutral economic impact - treatment shows no significant financial effect`);
  }

  // ROI insights
  if (economicImpact.roiPercentage > 100) {
    insights.push(`Exceptional ROI of ${economicImpact.roiPercentage.toFixed(1)}% indicates highly profitable optimization`);
  } else if (economicImpact.roiPercentage > 20) {
    insights.push(`Strong ROI of ${economicImpact.roiPercentage.toFixed(1)}% exceeds typical business thresholds`);
  } else if (economicImpact.roiPercentage > 0) {
    insights.push(`Positive ROI of ${economicImpact.roiPercentage.toFixed(1)}% provides business value`);
  } else {
    insights.push(`Negative ROI of ${economicImpact.roiPercentage.toFixed(1)}% suggests treatment reduces business value`);
  }

  // Metric-specific insights
  const sortedMetrics = Object.entries(economicImpact.metricBreakdown)
    .sort(([,a], [,b]) => Math.abs(b.dollarImpact) - Math.abs(a.dollarImpact));

  if (sortedMetrics.length > 0) {
    const [topMetricId, topMetric] = sortedMetrics[0];
    const impactDirection = topMetric.dollarImpact > 0 ? 'positive' : 'negative';
    insights.push(`Primary value driver: '${topMetricId}' contributes ${impactDirection} $${Math.abs(topMetric.dollarImpact).toFixed(2)} daily impact`);
  }

  // Duration-based insights
  if (experimentDurationDays < 7) {
    insights.push(`Short experiment duration (${experimentDurationDays} days) limits confidence in economic projections`);
  } else if (experimentDurationDays >= 30) {
    insights.push(`Extended experiment duration (${experimentDurationDays} days) provides reliable basis for economic projections`);
  }

  return insights;
}

/**
 * Calculate confidence intervals for economic impact
 */
export function calculateEconomicConfidenceInterval(
  didResults: { [metricId: string]: DidMetricResult },
  metricValues: { [metricId: string]: MetricValueSnapshot },
  confidenceLevel = 95
): { lower: number; upper: number } {
  let lowerBound = 0;
  let upperBound = 0;

  for (const [metricId, didResult] of Object.entries(didResults)) {
    const metricValue = metricValues[metricId];
    
    if (!metricValue) continue;

    const dollarsPerUnit = metricValue.dollarsPerUnit;
    
    // Use confidence interval from DiD analysis
    const lowerImpact = didResult.confidenceInterval.lower * dollarsPerUnit;
    const upperImpact = didResult.confidenceInterval.upper * dollarsPerUnit;
    
    lowerBound += lowerImpact;
    upperBound += upperImpact;
  }

  return {
    lower: lowerBound,
    upper: upperBound
  };
}

/**
 * Estimate implementation cost considerations
 */
export function estimateImplementationComplexity(
  didResults: { [metricId: string]: DidMetricResult }
): {
  complexity: 'low' | 'medium' | 'high';
  reasoning: string;
  recommendations: string[];
} {
  const significantMetrics = Object.entries(didResults)
    .filter(([, result]) => result.pValue < 0.05);
  
  const recommendations: string[] = [];
  
  // Simple heuristic based on number of metrics and effect sizes
  if (significantMetrics.length === 0) {
    return {
      complexity: 'low',
      reasoning: 'No significant effects to implement',
      recommendations: ['Monitor results over longer period', 'Consider alternative approaches']
    };
  }
  
  if (significantMetrics.length === 1) {
    recommendations.push('Focus implementation on single significant metric');
    return {
      complexity: 'low',
      reasoning: 'Single metric optimization is straightforward to implement',
      recommendations
    };
  }
  
  if (significantMetrics.length <= 3) {
    recommendations.push('Implement changes gradually to monitor individual metric impacts');
    recommendations.push('Consider A/B testing individual components');
    return {
      complexity: 'medium',
      reasoning: 'Multiple metrics require coordinated implementation approach',
      recommendations
    };
  }
  
  recommendations.push('Develop comprehensive implementation plan');
  recommendations.push('Consider phased rollout to manage complexity');
  recommendations.push('Establish monitoring for all affected metrics');
  
  return {
    complexity: 'high',
    reasoning: 'Complex multi-metric optimization requires careful orchestration',
    recommendations
  };
}