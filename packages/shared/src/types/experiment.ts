export interface ExperimentDefinition {
  // Primary Key
  id: string;                          // UUID
  
  // Basic Info
  name: string;
  description: string;
  status: 'draft' | 'running' | 'complete' | 'archived';
  
  // Configuration
  metrics: string[];                   // Array of metric IDs to track
  startDate: string;                   // ISO 8601 date string
  endDate: string;                     // ISO 8601 date string
  expectedOutcome: 'positive' | 'negative' | 'neutral';
  
  // Metadata
  createdAt: string;                   // ISO 8601 timestamp
  updatedAt: string;                   // ISO 8601 timestamp
  createdBy?: string;                  // User ID (future feature)
}