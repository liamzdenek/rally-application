/**
 * Generate insights and recommendations based on analysis results
 */

import { DidMetricResult, EconomicImpact } from '../../../shared/src/types';
import { generateDidInsights } from './did';
import { generateEconomicInsights, estimateImplementationComplexity } from './economics';
import { isStatisticallySignificant, interpretEffectSize } from '../utils/statistics';

export interface InsightAnalysis {
  summary: string;
  keyFindings: string[];
  recommendations: string[];
  riskFactors: string[];
  implementationGuidance: {
    complexity: 'low' | 'medium' | 'high';
    estimatedEffort: string;
    criticalSuccessFactors: string[];
  };
  confidence: {
    level: 'low' | 'medium' | 'high';
    reasoning: string;
  };
}

/**
 * Generate comprehensive insights from DiD and economic analysis
 */
export function generateComprehensiveInsights(
  didResults: { [metricId: string]: DidMetricResult },
  economicImpact: EconomicImpact,
  experimentPeriod: { startDate: string; endDate: string; durationDays: number },
  metricValuesSnapshot: { [metricId: string]: { dollarsPerUnit: number; description: string; unit: string } }
): InsightAnalysis {
  console.log('Generating comprehensive insights from analysis results');

  // Generate component insights
  const didInsights = generateDidInsights(didResults, experimentPeriod);
  const economicInsights = generateEconomicInsights(economicImpact, experimentPeriod.durationDays);
  const implementationAnalysis = estimateImplementationComplexity(didResults);

  // Analyze overall experiment quality
  const totalMetrics = Object.keys(didResults).length;
  const significantMetrics = Object.values(didResults).filter(result => isStatisticallySignificant(result.pValue)).length;
  const largeEffects = Object.values(didResults).filter(result => Math.abs(result.effectSize) > 0.8).length;

  // Generate summary
  const summary = generateExecutiveSummary(didResults, economicImpact, experimentPeriod);

  // Compile key findings
  const keyFindings = [
    ...didInsights.slice(0, 3), // Top 3 statistical insights
    ...economicInsights.slice(0, 2), // Top 2 economic insights
    ...generateDataQualityFindings(didResults, experimentPeriod)
  ];

  // Generate recommendations
  const recommendations = generateActionableRecommendations(
    didResults,
    economicImpact,
    implementationAnalysis,
    experimentPeriod
  );

  // Identify risk factors
  const riskFactors = identifyRiskFactors(didResults, economicImpact, experimentPeriod);

  // Implementation guidance
  const implementationGuidance = {
    complexity: implementationAnalysis.complexity,
    estimatedEffort: estimationEffortFromComplexity(implementationAnalysis.complexity, significantMetrics),
    criticalSuccessFactors: [
      ...implementationAnalysis.recommendations,
      ...generateSuccessFactors(didResults, economicImpact)
    ]
  };

  // Confidence assessment
  const confidence = assessConfidence(didResults, experimentPeriod, totalMetrics, significantMetrics);

  console.log(`Generated insights: ${keyFindings.length} findings, ${recommendations.length} recommendations, ${riskFactors.length} risks identified`);

  return {
    summary,
    keyFindings,
    recommendations,
    riskFactors,
    implementationGuidance,
    confidence
  };
}

/**
 * Generate executive summary
 */
function generateExecutiveSummary(
  didResults: { [metricId: string]: DidMetricResult },
  economicImpact: EconomicImpact,
  experimentPeriod: { startDate: string; endDate: string; durationDays: number }
): string {
  const totalMetrics = Object.keys(didResults).length;
  const significantMetrics = Object.values(didResults).filter(result => isStatisticallySignificant(result.pValue)).length;
  
  const impactDirection = economicImpact.totalImpact > 0 ? 'positive' : economicImpact.totalImpact < 0 ? 'negative' : 'neutral';
  const impactMagnitude = Math.abs(economicImpact.totalImpact);
  
  if (significantMetrics === 0) {
    return `Experiment conducted over ${experimentPeriod.durationDays} days showed no statistically significant effects across ${totalMetrics} measured metrics. Economic impact analysis indicates ${impactDirection} effect of $${impactMagnitude.toFixed(2)} daily, suggesting the tested treatment does not meaningfully improve user experience or business outcomes.`;
  }
  
  if (significantMetrics === totalMetrics) {
    return `Highly successful experiment over ${experimentPeriod.durationDays} days achieved statistical significance across all ${totalMetrics} measured metrics. ${impactDirection.charAt(0).toUpperCase() + impactDirection.slice(1)} economic impact of $${impactMagnitude.toFixed(2)} daily ($${Math.abs(economicImpact.annualizedImpact).toLocaleString()} annualized) strongly supports implementation of the tested treatment.`;
  }
  
  return `Mixed-results experiment over ${experimentPeriod.durationDays} days achieved statistical significance in ${significantMetrics} of ${totalMetrics} measured metrics. ${impactDirection.charAt(0).toUpperCase() + impactDirection.slice(1)} economic impact of $${impactMagnitude.toFixed(2)} daily ($${Math.abs(economicImpact.annualizedImpact).toLocaleString()} annualized) suggests selective implementation may be warranted.`;
}

/**
 * Generate data quality findings
 */
function generateDataQualityFindings(
  didResults: { [metricId: string]: DidMetricResult },
  experimentPeriod: { startDate: string; endDate: string; durationDays: number }
): string[] {
  const findings: string[] = [];
  
  // Sample size assessment
  const avgControlSampleSize = Object.values(didResults).reduce((sum, result) => sum + result.sampleSizeControl, 0) / Object.keys(didResults).length;
  const avgTreatmentSampleSize = Object.values(didResults).reduce((sum, result) => sum + result.sampleSizeTreatment, 0) / Object.keys(didResults).length;
  
  if (avgControlSampleSize < 100 || avgTreatmentSampleSize < 100) {
    findings.push(`Small sample sizes (avg control: ${avgControlSampleSize.toFixed(0)}, treatment: ${avgTreatmentSampleSize.toFixed(0)}) may limit statistical power`);
  } else if (avgControlSampleSize > 1000 && avgTreatmentSampleSize > 1000) {
    findings.push(`Large sample sizes (avg control: ${avgControlSampleSize.toFixed(0)}, treatment: ${avgTreatmentSampleSize.toFixed(0)}) provide high statistical power`);
  }
  
  // Duration assessment
  if (experimentPeriod.durationDays < 7) {
    findings.push(`Short experiment duration (${experimentPeriod.durationDays} days) may not capture full user behavior patterns`);
  }
  
  return findings;
}

/**
 * Generate actionable recommendations
 */
function generateActionableRecommendations(
  didResults: { [metricId: string]: DidMetricResult },
  economicImpact: EconomicImpact,
  implementationAnalysis: { complexity: 'low' | 'medium' | 'high'; recommendations: string[] },
  experimentPeriod: { startDate: string; endDate: string; durationDays: number }
): string[] {
  const recommendations: string[] = [];
  
  const significantMetrics = Object.entries(didResults).filter(([, result]) => isStatisticallySignificant(result.pValue));
  
  if (significantMetrics.length === 0) {
    recommendations.push('Do not implement the tested treatment - no significant improvements detected');
    recommendations.push('Consider testing alternative approaches or increasing sample size for future experiments');
    recommendations.push('Analyze user feedback to identify potential improvements not captured by current metrics');
  } else if (economicImpact.totalImpact > 0) {
    recommendations.push('Implement the tested treatment - positive economic impact justifies rollout');
    
    if (economicImpact.roiPercentage > 50) {
      recommendations.push('Prioritize immediate implementation due to high ROI potential');
    } else {
      recommendations.push('Plan gradual rollout to monitor real-world performance');
    }
    
    // Add implementation-specific recommendations
    recommendations.push(...implementationAnalysis.recommendations);
  } else {
    recommendations.push('Exercise caution - mixed or negative economic impact requires careful consideration');
    recommendations.push('Consider implementing only the components affecting significantly positive metrics');
    recommendations.push('Conduct cost-benefit analysis including implementation and maintenance costs');
  }
  
  // Duration-specific recommendations
  if (experimentPeriod.durationDays < 14) {
    recommendations.push('Consider running extended validation experiment before full implementation');
  }
  
  return recommendations;
}

/**
 * Identify risk factors
 */
function identifyRiskFactors(
  didResults: { [metricId: string]: DidMetricResult },
  economicImpact: EconomicImpact,
  experimentPeriod: { startDate: string; endDate: string; durationDays: number }
): string[] {
  const risks: string[] = [];
  
  // Statistical risks
  const highPValueMetrics = Object.entries(didResults).filter(([, result]) => result.pValue > 0.1 && result.pValue < 0.2);
  if (highPValueMetrics.length > 0) {
    risks.push(`Borderline significance in ${highPValueMetrics.length} metrics may indicate unstable effects`);
  }
  
  // Economic risks
  if (economicImpact.totalImpact < 0) {
    risks.push('Negative economic impact could result in revenue loss if implemented');
  }
  
  // Implementation risks based on complexity
  if (Object.keys(didResults).length > 5) {
    risks.push('Multiple metrics affected increases implementation complexity and failure risk');
  }
  
  // Duration risks
  if (experimentPeriod.durationDays < 7) {
    risks.push('Short experiment period may not capture seasonal or cyclical effects');
  }
  
  // Sample size risks
  const smallSampleMetrics = Object.entries(didResults).filter(([, result]) => 
    result.sampleSizeControl < 30 || result.sampleSizeTreatment < 30
  );
  if (smallSampleMetrics.length > 0) {
    risks.push(`Small sample sizes in ${smallSampleMetrics.length} metrics may produce unreliable results`);
  }
  
  return risks;
}

/**
 * Generate success factors
 */
function generateSuccessFactors(
  didResults: { [metricId: string]: DidMetricResult },
  economicImpact: EconomicImpact
): string[] {
  const factors: string[] = [];
  
  if (economicImpact.totalImpact > 0) {
    factors.push('Monitor economic metrics closely during rollout to validate projected impact');
  }
  
  const strongEffectMetrics = Object.entries(didResults).filter(([, result]) => Math.abs(result.effectSize) > 0.8);
  if (strongEffectMetrics.length > 0) {
    factors.push(`Focus on metrics with strong effects: ${strongEffectMetrics.map(([id]) => id).join(', ')}`);
  }
  
  factors.push('Establish baseline measurements before implementation');
  factors.push('Plan rollback strategy in case of unexpected negative effects');
  
  return factors;
}

/**
 * Estimate effort from complexity
 */
function estimationEffortFromComplexity(complexity: 'low' | 'medium' | 'high', significantMetrics: number): string {
  const baseWeeks = {
    low: 1,
    medium: 3,
    high: 6
  };
  
  const adjustedWeeks = baseWeeks[complexity] + Math.floor(significantMetrics / 2);
  
  if (adjustedWeeks <= 1) return '1-2 weeks';
  if (adjustedWeeks <= 4) return '2-4 weeks';
  if (adjustedWeeks <= 8) return '1-2 months';
  return '2+ months';
}

/**
 * Assess confidence level
 */
function assessConfidence(
  didResults: { [metricId: string]: DidMetricResult },
  experimentPeriod: { startDate: string; endDate: string; durationDays: number },
  totalMetrics: number,
  significantMetrics: number
): { level: 'low' | 'medium' | 'high'; reasoning: string } {
  let confidenceScore = 0;
  const factors: string[] = [];
  
  // Duration factor
  if (experimentPeriod.durationDays >= 14) {
    confidenceScore += 2;
    factors.push('adequate experiment duration');
  } else if (experimentPeriod.durationDays >= 7) {
    confidenceScore += 1;
  } else {
    factors.push('short experiment duration');
  }
  
  // Sample size factor
  const avgSampleSize = Object.values(didResults).reduce((sum, result) => 
    sum + result.sampleSizeControl + result.sampleSizeTreatment, 0) / (totalMetrics * 2);
  
  if (avgSampleSize >= 500) {
    confidenceScore += 2;
    factors.push('large sample sizes');
  } else if (avgSampleSize >= 100) {
    confidenceScore += 1;
  } else {
    factors.push('small sample sizes');
  }
  
  // Consistency factor
  const consistencyRatio = significantMetrics / totalMetrics;
  if (consistencyRatio >= 0.8 || consistencyRatio === 0) {
    confidenceScore += 2;
    factors.push('consistent results across metrics');
  } else if (consistencyRatio >= 0.5) {
    confidenceScore += 1;
  } else {
    factors.push('mixed results across metrics');
  }
  
  // Effect size factor
  const strongEffects = Object.values(didResults).filter(result => Math.abs(result.effectSize) > 0.5).length;
  if (strongEffects >= totalMetrics * 0.5) {
    confidenceScore += 1;
    factors.push('strong effect sizes');
  }
  
  if (confidenceScore >= 6) {
    return { level: 'high', reasoning: `High confidence due to ${factors.join(', ')}` };
  } else if (confidenceScore >= 3) {
    return { level: 'medium', reasoning: `Medium confidence with ${factors.join(', ')}` };
  } else {
    return { level: 'low', reasoning: `Low confidence due to ${factors.join(', ')}` };
  }
}