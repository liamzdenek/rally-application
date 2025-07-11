export interface MetricValue {
  // Primary Key
  metricId: string;                    // e.g., "conversion_rate", "aov", "ctr"
  
  // Economic Value
  dollarsPerUnit: number;              // Dollar value per unit increase
  unit: string;                        // "%", "$", "seconds", etc.
  
  // Metadata
  name: string;                        // Human-readable name
  description: string;                 // Explanation of economic calculation
  category: 'conversion' | 'revenue' | 'engagement' | 'retention' | 'other';
  
  // Version History
  lastUpdated: string;                 // ISO 8601 timestamp
  updatedBy?: string;                  // User ID (future feature)
  version: number;                     // Incremental version number
  
  // Validation Rules
  validationRules?: {
    minValue?: number;
    maxValue?: number;
    decimalPlaces?: number;
  };
}

export interface ValidationRules {
  minValue?: number;
  maxValue?: number;
  decimalPlaces?: number;
}