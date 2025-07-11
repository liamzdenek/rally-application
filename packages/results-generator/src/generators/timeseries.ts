import { ExperimentPeriod } from '@rallyuxr/shared';

export interface TimeSeriesConfig {
  startDate: string;
  endDate: string;
  granularity: 'hour' | 'day';
}

/**
 * Generate experiment period metadata
 */
export function generateExperimentPeriod(config: TimeSeriesConfig): ExperimentPeriod {
  const startDate = new Date(config.startDate);
  const endDate = new Date(config.endDate);
  
  let totalHours: number;
  
  if (config.granularity === 'hour') {
    totalHours = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60));
  } else {
    // Daily granularity - calculate days and convert to hours for consistency
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    totalHours = totalDays * 24;
  }
  
  return {
    startDate: startDate.toISOString().split('T')[0], // ISO date format (YYYY-MM-DD)
    endDate: endDate.toISOString().split('T')[0],
    totalHours
  };
}

/**
 * Generate realistic timestamps for the experiment period
 */
export function generateTimestamps(period: ExperimentPeriod, granularity: 'hour' | 'day' = 'hour'): string[] {
  const timestamps: string[] = [];
  const startDate = new Date(period.startDate);
  
  if (granularity === 'hour') {
    for (let hour = 0; hour < period.totalHours; hour++) {
      const timestamp = new Date(startDate.getTime() + hour * 60 * 60 * 1000);
      timestamps.push(timestamp.toISOString());
    }
  } else {
    // Daily granularity
    const totalDays = Math.ceil(period.totalHours / 24);
    for (let day = 0; day < totalDays; day++) {
      const timestamp = new Date(startDate.getTime() + day * 24 * 60 * 60 * 1000);
      // Set to noon for consistent daily timestamps
      timestamp.setHours(12, 0, 0, 0);
      timestamps.push(timestamp.toISOString());
    }
  }
  
  return timestamps;
}

/**
 * Add realistic business hour patterns to data
 */
export function applyBusinessHourPattern(
  timestamp: string,
  baseValue: number,
  intensity = 0.3
): number {
  const date = new Date(timestamp);
  const hour = date.getUTCHours();
  const dayOfWeek = date.getUTCDay(); // 0 = Sunday, 6 = Saturday
  
  // Business hours multiplier (9 AM to 5 PM weekdays have higher activity)
  let businessHourMultiplier = 1.0;
  
  if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday to Friday
    if (hour >= 9 && hour <= 17) {
      businessHourMultiplier = 1.0 + intensity; // Higher activity during business hours
    } else if (hour >= 6 && hour <= 9 || hour >= 17 && hour <= 22) {
      businessHourMultiplier = 1.0 + intensity * 0.5; // Moderate activity in evening/morning
    } else {
      businessHourMultiplier = 1.0 - intensity * 0.8; // Lower activity at night
    }
  } else { // Weekend
    if (hour >= 10 && hour <= 20) {
      businessHourMultiplier = 1.0 + intensity * 0.3; // Moderate weekend activity
    } else {
      businessHourMultiplier = 1.0 - intensity * 0.6; // Lower weekend night activity
    }
  }
  
  return baseValue * businessHourMultiplier;
}