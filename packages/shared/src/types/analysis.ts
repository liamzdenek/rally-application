export interface ExperimentAnalysis {
  // Primary Key
  experimentId: string;                // Partition Key
  analysisId: string;                  // Sort Key: timestamp-based UUID
  
  // DiD Analysis Results
  didResults: {
    [metricId: string]: {
      treatmentMean: number;           // Average treatment value
      controlMean: number;             // Average control value
      absoluteDifference: number;      // Treatment - Control
      relativeDifference: number;      // (Treatment - Control) / Control
      pValue: number;                  // Statistical significance
      confidenceLevel: number;         // 95, 99, etc.
      confidenceInterval: {
        lower: number;
        upper: number;
      };
      sampleSizeControl: number;
      sampleSizeTreatment: number;
      effectSize: number;              // Cohen's d or similar
    };
  };
  
  // Economic Impact Calculation
  economicImpact: {
    totalImpact: number;               // Total dollar impact
    annualizedImpact: number;          // Projected annual impact
    roiPercentage: number;             // Return on investment
    metricBreakdown: {
      [metricId: string]: {
        dollarImpact: number;          // Impact for this specific metric
        metricValueUsed: number;       // Dollar/unit value used in calculation
        metricChange: number;          // Absolute change in metric
      };
    };
  };
  
  // Snapshot of Metric Values (for historical accuracy)
  metricValuesSnapshot: {
    [metricId: string]: {
      dollarsPerUnit: number;
      description: string;
      unit: string;
    };
  };
  
  // Analysis Metadata
  analysisTimestamp: string;           // When analysis was performed
  experimentPeriod: {
    startDate: string;
    endDate: string;
    durationDays: number;
  };
  status: 'processing' | 'complete' | 'failed';
  version: string;                     // Analysis algorithm version
}

export interface DidMetricResult {
  treatmentMean: number;           // Average treatment value
  controlMean: number;             // Average control value
  absoluteDifference: number;      // Treatment - Control
  relativeDifference: number;      // (Treatment - Control) / Control
  pValue: number;                  // Statistical significance
  confidenceLevel: number;         // 95, 99, etc.
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  sampleSizeControl: number;
  sampleSizeTreatment: number;
  effectSize: number;              // Cohen's d or similar
}

export interface EconomicImpact {
  totalImpact: number;               // Total dollar impact
  annualizedImpact: number;          // Projected annual impact
  roiPercentage: number;             // Return on investment
  metricBreakdown: {
    [metricId: string]: {
      dollarImpact: number;          // Impact for this specific metric
      metricValueUsed: number;       // Dollar/unit value used in calculation
      metricChange: number;          // Absolute change in metric
    };
  };
}

export interface MetricValueSnapshot {
  dollarsPerUnit: number;
  description: string;
  unit: string;
}

export interface ConfidenceInterval {
  lower: number;
  upper: number;
}

export interface AnalysisPeriod {
  startDate: string;
  endDate: string;
  durationDays: number;
}