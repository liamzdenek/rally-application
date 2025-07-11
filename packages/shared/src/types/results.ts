export interface ExperimentResult {
  // Primary Key
  experimentId: string;                // Partition Key
  
  // Experiment Data
  metrics: {
    [metricId: string]: {
      timeSeries: Array<{
        timestamp: string;             // ISO 8601 datetime (hourly intervals)
        treatmentValue: number;        // Metric value for treatment group
        controlValue: number;          // Metric value for control group
        treatmentSampleSize: number;   // Number of users in treatment
        controlSampleSize: number;     // Number of users in control
      }>;
      summary: {
        treatmentMean: number;         // Average treatment value over period
        controlMean: number;           // Average control value over period
        totalTreatmentSamples: number; // Total treatment participants
        totalControlSamples: number;   // Total control participants
      };
    };
  };
  
  // Metadata
  generatedAt: string;                 // When this data was created
  experimentPeriod: {
    startDate: string;                 // ISO 8601 date
    endDate: string;                   // ISO 8601 date
    totalHours: number;                // Number of data points
  };
}

export interface TimeSeriesPoint {
  timestamp: string;             // ISO 8601 datetime
  treatmentValue: number;        // Metric value for treatment group
  controlValue: number;          // Metric value for control group
  treatmentSampleSize: number;   // Number of users in treatment
  controlSampleSize: number;     // Number of users in control
}

export interface MetricSummary {
  treatmentMean: number;         // Average treatment value over period
  controlMean: number;           // Average control value over period
  totalTreatmentSamples: number; // Total treatment participants
  totalControlSamples: number;   // Total control participants
}

export interface ExperimentPeriod {
  startDate: string;             // ISO 8601 date
  endDate: string;               // ISO 8601 date
  totalHours: number;            // Number of data points
}