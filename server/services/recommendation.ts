import { ReplitApp, AppStatus, LogEntry } from "@shared/schema";
import { storage } from "../storage";

// Constants for recommendation logic
const MEMORY_LEAK_THRESHOLD_HOURS = 24; // After how many hours of uptime we suspect memory leaks
const HIGH_FAILURE_RATE = 15; // Failure rate considered high (percentage)
const MEDIUM_FAILURE_RATE = 8; // Failure rate considered medium (percentage)
const MAX_PATTERN_HISTORY_DAYS = 7; // How many days back to look for patterns
const PEAK_HOURS_START = 8; // Peak hours start (24hr format)
const PEAK_HOURS_END = 18; // Peak hours end (24hr format)
const PERIODIC_RESTART_INTERVAL_DAYS = 3; // Recommended interval between preventative restarts
const PREDICTION_WINDOW_HOURS = 24; // How many hours ahead to predict
const FAILURE_PROBABILITY_THRESHOLD = 0.7; // Threshold for predicted failure probability to trigger alert (0-1)

// Prediction model parameters
const RECENCY_WEIGHT = 2.0; // Weight for recent events vs older events
const TIME_PATTERN_WEIGHT = 1.5; // Weight for time-based patterns
const MEMORY_LEAK_WEIGHT = 1.8; // Weight for memory leak probability
const FAILURE_HISTORY_WEIGHT = 1.2; // Weight for historical failure patterns

/**
 * Interface for restart recommendation
 */
export interface RestartRecommendation {
  appId: number;
  appName: string;
  recommendationScore: number; // 0-100, higher means stronger recommendation
  reason: string;
  lastRestarted: Date | null;
  statusHistory: string[];
  uptime: number; // in minutes
  
  // Additional information for more detailed UI display
  primaryFactor?: string; // Main reason for recommendation
  urgency?: 'low' | 'medium' | 'high' | 'critical'; // How urgent is this restart
  predictedIssues?: string[]; // What might happen if not restarted
  recommendedTimeWindow?: string; // When should this restart happen
  memoryLeakLikelihood?: number; // Probability of memory leak (0-100)
  
  // Ghost process related information
  ghostProcessDetections?: number; // Number of ghost process detections
  ghostProcessTerminations?: number; // Number of ghost process terminations
  hasGhostProcesses?: boolean; // Whether ghost processes have been detected
  
  // For future feature
  insights?: string[]; // Additional insights from advanced analysis
  confidenceScore?: number; // Confidence in the recommendation (0-100)
  alternativeSolutions?: string[]; // Alternative solutions
}

/**
 * Interface for app health metrics
 */
interface AppHealthMetrics {
  // Basic metrics
  failureRate: number; // percentage of failed status checks
  averageUptime: number; // average uptime in minutes
  restartFrequency: number; // average number of restarts per day
  statusTransitions: number; // number of status changes (running <-> stopped)
  errorOccurrences: number; // count of error status occurrences
  lastRestarted: Date | null;
  
  // Advanced metrics
  errorFrequencyTrend: 'increasing' | 'decreasing' | 'stable'; // is error frequency increasing over time?
  timeBasedPatterns: TimeBasedPattern[]; // time-based patterns of failures
  errorDensity: number; // errors per hour of operation
  uptimeStability: number; // variance in uptime periods (lower is more stable)
  performanceDegradation: number; // estimated % of performance degradation based on patterns
  memoryLeakLikelihood: number; // likelihood of memory leak (0-100)
  daysSinceLastRestart: number; // days since last restart
  
  // Ghost process metrics
  ghostProcessDetections?: number; // count of ghost process detections
  ghostProcessTerminations?: number; // count of ghost process terminations
  hasGhostProcesses?: boolean; // whether ghost processes have been detected
}

/**
 * Interface for time-based failure patterns
 */
interface TimeBasedPattern {
  timeOfDay: number; // hour of day (0-23)
  dayOfWeek: number; // day of week (0-6, 0 is Sunday)
  failureRate: number; // failure rate at this time
  confidence: number; // confidence in this pattern (0-100)
}

/**
 * Interface for failure prediction time slot
 */
interface FailurePredictionTimeSlot {
  startTime: Date; // Start time of this prediction slot
  endTime: Date; // End time of this prediction slot
  failureProbability: number; // Probability of failure (0-1)
  confidenceScore: number; // Confidence in this prediction (0-100)
  predictedMetrics?: { // Optional predicted metrics
    responseTime?: number; // Predicted response time in ms
    errorRate?: number; // Predicted error rate percentage 
    availabilityPercent?: number; // Predicted availability percentage
    resourceUtilization?: number; // Predicted resource utilization percentage
  };
  contributingFactors: string[]; // Factors contributing to this prediction
}

/**
 * Interface for application prediction model
 */
interface AppPredictionModel {
  appId: number;
  appName: string;
  predictionGenerated: Date; // When this prediction was generated
  predictionTimeSlots: FailurePredictionTimeSlot[]; // Prediction time slots
  aggregatedFailureProbability: number; // Overall probability of failure in prediction window (0-1)
  recommendedActions: string[]; // Recommended actions to prevent predicted failures
  highRiskPeriods: { // Identified high risk time periods
    startTime: Date;
    endTime: Date;
    risk: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }[];
}

/**
 * Generate failure predictions for a specific app
 */
export async function generateAppPredictions(appId: number): Promise<AppPredictionModel | null> {
  try {
    const app = await storage.getApp(appId);
    if (!app) return null;
    
    const logs = await storage.getLogs(appId);
    if (!logs || logs.length === 0) return null;
    
    // Get app health metrics
    const healthMetrics = await calculateAppHealthMetrics(app, logs);
    
    // Create prediction time slots
    const predictionTimeSlots: FailurePredictionTimeSlot[] = [];
    const now = new Date();
    
    // Create slots for the next PREDICTION_WINDOW_HOURS hours, 1 hour per slot
    for (let hour = 1; hour <= PREDICTION_WINDOW_HOURS; hour++) {
      const slotStartTime = new Date(now.getTime());
      slotStartTime.setHours(now.getHours() + hour - 1);
      
      const slotEndTime = new Date(now.getTime());
      slotEndTime.setHours(now.getHours() + hour);
      
      const { 
        failureProbability, 
        confidenceScore, 
        predictedMetrics, 
        contributingFactors 
      } = predictFailureForTimeSlot(app, healthMetrics, slotStartTime, logs);
      
      predictionTimeSlots.push({
        startTime: slotStartTime,
        endTime: slotEndTime,
        failureProbability,
        confidenceScore,
        predictedMetrics,
        contributingFactors
      });
    }
    
    // Calculate aggregated failure probability across all time slots
    const aggregatedFailureProbability = predictionTimeSlots.reduce(
      (sum, slot) => sum + (slot.failureProbability * (slot.confidenceScore / 100)), 
      0
    ) / predictionTimeSlots.length;
    
    // Identify high-risk periods
    const highRiskPeriods = identifyHighRiskPeriods(predictionTimeSlots);
    
    // Generate recommended actions
    const recommendedActions = generateRecommendedActions(
      app, 
      healthMetrics, 
      predictionTimeSlots, 
      aggregatedFailureProbability
    );
    
    return {
      appId: app.id,
      appName: app.name,
      predictionGenerated: new Date(),
      predictionTimeSlots,
      aggregatedFailureProbability,
      recommendedActions,
      highRiskPeriods
    };
  } catch (error) {
    console.error(`Error generating predictions for app ${appId}:`, error);
    return null;
  }
}

/**
 * Generate failure predictions for all apps
 */
export async function generateAllAppPredictions(): Promise<AppPredictionModel[]> {
  try {
    const apps = await storage.getApps();
    const predictions: AppPredictionModel[] = [];
    
    for (const app of apps) {
      const prediction = await generateAppPredictions(app.id);
      if (prediction) {
        predictions.push(prediction);
      }
    }
    
    // Sort by aggregated failure probability (highest first)
    return predictions.sort((a, b) => b.aggregatedFailureProbability - a.aggregatedFailureProbability);
  } catch (error) {
    console.error("Error generating predictions:", error);
    return [];
  }
}

/**
 * Get restart recommendations for all apps
 */
export async function getRestartRecommendations(): Promise<RestartRecommendation[]> {
  try {
    const apps = await storage.getApps();
    const recommendations: RestartRecommendation[] = [];
    
    for (const app of apps) {
      const recommendation = await analyzeApp(app);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    }
    
    // Sort by recommendation score (highest first)
    return recommendations.sort((a, b) => b.recommendationScore - a.recommendationScore);
  } catch (error) {
    console.error("Error generating restart recommendations:", error);
    return [];
  }
}

/**
 * Get restart recommendation for a specific app
 */
export async function getAppRestartRecommendation(appId: number): Promise<RestartRecommendation | null> {
  try {
    const app = await storage.getApp(appId);
    if (!app) return null;
    
    return await analyzeApp(app);
  } catch (error) {
    console.error(`Error generating restart recommendation for app ${appId}:`, error);
    return null;
  }
}

/**
 * Analyze an app and provide restart recommendation
 */
async function analyzeApp(app: ReplitApp): Promise<RestartRecommendation | null> {
  try {
    const logs = await storage.getLogs(app.id);
    if (!logs || logs.length === 0) return null;
    
    // Get app health metrics
    const healthMetrics = await calculateAppHealthMetrics(app, logs);
    
    // Determine if app needs a restart recommendation
    const recommendationScore = calculateRecommendationScore(app, healthMetrics);
    
    // If score is too low, don't recommend restart
    if (recommendationScore < 20) return null;
    
    // Determine the reason for recommendation
    const reason = determineRestartReason(app, healthMetrics, recommendationScore);
    
    // Get status history
    const statusHistory = logs
      .filter(log => log.action === "Status Change" || log.action.includes("Restart") || log.action.includes("Start"))
      .slice(0, 5)
      .map(log => `${new Date(log.timestamp).toLocaleString()}: ${log.action} - ${log.status}`);
    
    // Determine urgency level based on score and current status
    let urgency: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (recommendationScore >= 80 || app.status === AppStatus.UNREACHABLE || app.status === AppStatus.ERROR) {
      urgency = 'critical';
    } else if (recommendationScore >= 60) {
      urgency = 'high';
    } else if (recommendationScore >= 40) {
      urgency = 'medium';
    }
    
    // Determine primary factor for the recommendation
    let primaryFactor = '';
    if (app.status === AppStatus.UNREACHABLE || app.status === AppStatus.ERROR) {
      primaryFactor = 'Current Error State';
    } else if (healthMetrics.memoryLeakLikelihood > 60) {
      primaryFactor = 'Probable Memory Leak';
    } else if (healthMetrics.errorFrequencyTrend === 'increasing') {
      primaryFactor = 'Increasing Error Rate';
    } else if (healthMetrics.performanceDegradation > 30) {
      primaryFactor = 'Performance Degradation';
    } else if (healthMetrics.timeBasedPatterns.length > 0) {
      primaryFactor = 'Time-based Failure Pattern';
    } else if (healthMetrics.daysSinceLastRestart > PERIODIC_RESTART_INTERVAL_DAYS) {
      primaryFactor = 'Extended Uptime';
    } else {
      primaryFactor = 'General Stability';
    }
    
    // Predict potential issues if not restarted
    const predictedIssues: string[] = [];
    
    if (healthMetrics.memoryLeakLikelihood > 50) {
      predictedIssues.push('Potential application crash due to memory exhaustion');
    }
    
    if (healthMetrics.errorFrequencyTrend === 'increasing') {
      predictedIssues.push('Progressively degrading user experience as errors increase');
    }
    
    if (healthMetrics.performanceDegradation > 20) {
      predictedIssues.push('Slowed response times and reduced throughput');
    }
    
    if (app.status !== AppStatus.RUNNING) {
      predictedIssues.push('Continued service unavailability');
    }
    
    if (predictedIssues.length === 0) {
      predictedIssues.push('Potential periodic instability');
    }
    
    // Recommended time window for restart
    let recommendedTimeWindow = '';
    
    if (urgency === 'critical') {
      recommendedTimeWindow = 'Immediate restart recommended';
    } else if (urgency === 'high') {
      recommendedTimeWindow = 'Within the next hour';
    } else if (urgency === 'medium') {
      recommendedTimeWindow = 'Within the next 24 hours';
    } else {
      recommendedTimeWindow = 'During the next scheduled maintenance';
    }
    
    const recommendation: RestartRecommendation = {
      appId: app.id,
      appName: app.name,
      recommendationScore,
      reason,
      lastRestarted: healthMetrics.lastRestarted,
      statusHistory,
      uptime: healthMetrics.averageUptime,
      
      // New enriched fields
      primaryFactor,
      urgency,
      predictedIssues,
      recommendedTimeWindow,
      memoryLeakLikelihood: Math.round(healthMetrics.memoryLeakLikelihood),
      
      // Ghost process information
      ghostProcessDetections: healthMetrics.ghostProcessDetections,
      ghostProcessTerminations: healthMetrics.ghostProcessTerminations,
      hasGhostProcesses: healthMetrics.hasGhostProcesses
    };
    
    // Add example insights based on our analysis
    try {
      // Only add additional insights if the recommendation score is high enough
      if (recommendationScore >= 50) {
        // Generate insights based on health metrics and app status
        const insights: string[] = [];
        
        if (app.status === AppStatus.ERROR || app.status === AppStatus.UNREACHABLE) {
          insights.push(`App ${app.name} is currently in a failed state and requires immediate attention.`);
        }
        
        if (healthMetrics.memoryLeakLikelihood > 60) {
          insights.push(`Memory usage pattern indicates potential resource exhaustion over time.`);
        }
        
        if (healthMetrics.errorFrequencyTrend === 'increasing') {
          insights.push(`Errors are becoming more frequent, suggesting a worsening condition.`);
        }
        
        if (healthMetrics.timeBasedPatterns.length > 0) {
          const pattern = healthMetrics.timeBasedPatterns[0];
          insights.push(`Failures occur more frequently at hour ${pattern.timeOfDay} with ${pattern.confidence}% confidence.`);
        }
        
        if (insights.length > 0) {
          recommendation.insights = insights;
        }
        
        // Generate alternative solutions if appropriate
        const alternativeSolutions: string[] = [];
        
        if (app.status === AppStatus.ERROR || app.status === AppStatus.UNREACHABLE) {
          alternativeSolutions.push("Check application logs for specific error messages");
          alternativeSolutions.push("Verify network connectivity and firewall rules");
        }
        
        if (healthMetrics.memoryLeakLikelihood > 50) {
          alternativeSolutions.push("Monitor memory usage patterns to identify resource-intensive components");
          alternativeSolutions.push("Implement resource cleanup routines in the application code");
        }
        
        if (healthMetrics.performanceDegradation > 30) {
          alternativeSolutions.push("Optimize database queries or implement query caching");
          alternativeSolutions.push("Add load balancing if traffic patterns show high demand periods");
        }
        
        if (alternativeSolutions.length > 0) {
          recommendation.alternativeSolutions = alternativeSolutions;
        }
        
        // Set the confidence score based on our analysis certainty
        recommendation.confidenceScore = Math.min(
          95, // Max confidence
          Math.round(40 + (recommendationScore / 2)) // Base confidence plus score-based adjustment
        );
      }
    } catch (error) {
      console.error(`Error during enhanced analysis for app ${app.id}:`, error);
      // Continue with the regular recommendation even if enhanced analysis fails
    }
    
    return recommendation;
  } catch (error) {
    console.error(`Error analyzing app ${app.id}:`, error);
    return null;
  }
}

/**
 * Calculate health metrics for an app
 */
async function calculateAppHealthMetrics(app: ReplitApp, logs: LogEntry[]): Promise<AppHealthMetrics> {
  // Only process logs from the last week to focus on recent patterns
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - MAX_PATTERN_HISTORY_DAYS);
  
  // Sort logs by timestamp (oldest first for chronological analysis)
  logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  // Filter logs by type
  const recentLogs = logs.filter(log => new Date(log.timestamp) >= oneWeekAgo);
  const statusLogs = recentLogs.filter(log => log.action === "Status Change");
  const restartLogs = recentLogs.filter(log => 
    log.action.includes("Restart") || 
    log.action === "Started" || 
    log.action === "Stopped"
  );
  const errorLogs = recentLogs.filter(log => 
    log.action.includes("Error") || 
    log.action.includes("Failed") || 
    log.status === AppStatus.ERROR || 
    log.status === AppStatus.UNREACHABLE
  );
  
  // Ghost process related logs
  const ghostProcessLogs = recentLogs.filter(log => 
    log.action.includes("Ghost Process") || 
    log.action.includes("Process Terminated")
  );
  
  // ===== Basic Metrics =====
  const totalStatusChecks = statusLogs.length;
  const failedChecks = errorLogs.length;
  const failureRate = totalStatusChecks > 0 ? (failedChecks / totalStatusChecks) * 100 : 0;
  
  // Calculate status transitions
  let statusTransitions = 0;
  let previousStatus = "";
  for (const log of statusLogs) {
    if (log.status && previousStatus && log.status !== previousStatus) {
      statusTransitions++;
    }
    previousStatus = log.status || "";
  }
  
  // Find last restart time
  let lastRestarted: Date | null = null;
  for (const log of restartLogs) {
    if (log.action.includes("Restart") && log.timestamp) {
      const logTime = new Date(log.timestamp);
      if (!lastRestarted || logTime > lastRestarted) {
        lastRestarted = logTime;
      }
    }
  }
  
  // Calculate days since last restart
  const daysSinceLastRestart = lastRestarted 
    ? (new Date().getTime() - lastRestarted.getTime()) / (1000 * 60 * 60 * 24) 
    : MAX_PATTERN_HISTORY_DAYS; // If never restarted, use max history days
  
  // Calculate uptime
  let totalUptime = 0;
  let uptimeCount = 0;
  let startTime: Date | null = null;
  const uptimePeriods: number[] = []; // Store individual uptime periods for variance calculation
  
  for (const log of statusLogs) {
    if (log.status === AppStatus.RUNNING && !startTime) {
      startTime = new Date(log.timestamp);
    } else if (log.status !== AppStatus.RUNNING && startTime) {
      const endTime = new Date(log.timestamp);
      const uptimeMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
      totalUptime += uptimeMinutes;
      uptimePeriods.push(uptimeMinutes);
      uptimeCount++;
      startTime = null;
    }
  }
  
  // If app is currently running, calculate current uptime
  if (startTime && app.status === AppStatus.RUNNING) {
    const now = new Date();
    const currentUptimeMinutes = (now.getTime() - startTime.getTime()) / (1000 * 60);
    totalUptime += currentUptimeMinutes;
    uptimePeriods.push(currentUptimeMinutes);
    uptimeCount++;
  }
  
  const averageUptime = uptimeCount > 0 ? totalUptime / uptimeCount : 0;
  
  // Calculate restart frequency (restarts per day)
  const timeSpan = recentLogs.length > 0 ? 
    (new Date().getTime() - new Date(recentLogs[0].timestamp).getTime()) / (1000 * 60 * 60 * 24) : 1;
  const restartFrequency = timeSpan > 0 
    ? restartLogs.filter(log => log.action.includes("Restart")).length / timeSpan 
    : 0;
  
  // ===== Advanced Metrics =====
  
  // 1. Analyze error frequency trend
  let errorFrequencyTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (errorLogs.length >= 5) {
    // Split error logs into two halves to compare
    const midpoint = Math.floor(errorLogs.length / 2);
    const firstHalfErrors = errorLogs.slice(0, midpoint);
    const secondHalfErrors = errorLogs.slice(midpoint);
    
    // Calculate time spans for both halves
    const firstHalfSpan = 
      (new Date(firstHalfErrors[firstHalfErrors.length-1].timestamp).getTime() - 
       new Date(firstHalfErrors[0].timestamp).getTime()) / (1000 * 60 * 60); // hours
    
    const secondHalfSpan = 
      (new Date(secondHalfErrors[secondHalfErrors.length-1].timestamp).getTime() - 
       new Date(secondHalfErrors[0].timestamp).getTime()) / (1000 * 60 * 60); // hours
    
    // Calculate error rates (errors per hour) for both halves
    const firstHalfRate = firstHalfSpan > 0 ? firstHalfErrors.length / firstHalfSpan : 0;
    const secondHalfRate = secondHalfSpan > 0 ? secondHalfErrors.length / secondHalfSpan : 0;
    
    // Determine trend
    const changeThreshold = 0.2; // 20% change to consider significant
    const rateDifference = secondHalfRate - firstHalfRate;
    const percentChange = firstHalfRate > 0 ? rateDifference / firstHalfRate : 0;
    
    if (percentChange > changeThreshold) {
      errorFrequencyTrend = 'increasing';
    } else if (percentChange < -changeThreshold) {
      errorFrequencyTrend = 'decreasing';
    }
  }
  
  // 2. Calculate error density (errors per hour of operation)
  const totalOperatingHours = totalUptime / 60; // Convert minutes to hours
  const errorDensity = totalOperatingHours > 0 ? errorLogs.length / totalOperatingHours : 0;
  
  // 3. Calculate uptime stability (using coefficient of variation)
  let uptimeStability = 0;
  if (uptimePeriods.length > 1) {
    const mean = uptimePeriods.reduce((sum, val) => sum + val, 0) / uptimePeriods.length;
    const variance = uptimePeriods.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / uptimePeriods.length;
    const stdDev = Math.sqrt(variance);
    uptimeStability = mean > 0 ? stdDev / mean : 0; // Coefficient of variation
  }
  
  // 4. Analyze time-based patterns
  const timeBasedPatterns: TimeBasedPattern[] = [];
  
  // Group error logs by hour of day and day of week
  const errorsByTime: Record<string, LogEntry[]> = {};
  
  for (const log of errorLogs) {
    const date = new Date(log.timestamp);
    const hour = date.getHours();
    const day = date.getDay();
    const key = `${day}-${hour}`;
    
    if (!errorsByTime[key]) {
      errorsByTime[key] = [];
    }
    
    errorsByTime[key].push(log);
  }
  
  // Calculate time patterns
  for (const [key, logs] of Object.entries(errorsByTime)) {
    const [day, hour] = key.split('-').map(Number);
    
    // Count total checks in this time slot
    const checksInTimeSlot = statusLogs.filter(log => {
      const date = new Date(log.timestamp);
      return date.getHours() === hour && date.getDay() === day;
    }).length;
    
    // Calculate failure rate for this time slot
    const slotFailureRate = checksInTimeSlot > 0 ? (logs.length / checksInTimeSlot) * 100 : 0;
    
    // Only consider significant patterns
    if (slotFailureRate > failureRate * 1.5 && logs.length >= 3) {
      // Calculate confidence based on sample size
      const confidence = Math.min(100, 40 + (logs.length * 10));
      
      timeBasedPatterns.push({
        timeOfDay: hour,
        dayOfWeek: day,
        failureRate: slotFailureRate,
        confidence
      });
    }
  }
  
  // Sort patterns by confidence (highest first)
  timeBasedPatterns.sort((a, b) => b.confidence - a.confidence);
  
  // 5. Estimate performance degradation based on error patterns and uptime
  let performanceDegradation = 0;
  
  // Factor 1: Longer uptime correlates with degradation due to memory leaks
  const uptimeHours = averageUptime / 60;
  if (uptimeHours > MEMORY_LEAK_THRESHOLD_HOURS) {
    // Exponential growth curve for degradation as uptime increases
    const hoursPastThreshold = uptimeHours - MEMORY_LEAK_THRESHOLD_HOURS;
    performanceDegradation += Math.min(50, 10 * Math.log(1 + hoursPastThreshold / 12));
  }
  
  // Factor 2: Increasing error frequency trend
  if (errorFrequencyTrend === 'increasing') {
    performanceDegradation += 20;
  }
  
  // Factor 3: High uptime instability
  if (uptimeStability > 0.5) { // High variation in uptime periods
    performanceDegradation += 15;
  }
  
  // 6. Calculate memory leak likelihood
  let memoryLeakLikelihood = 0;
  
  // Factors that suggest memory leaks:
  // - Long uptime correlates with errors
  // - App has been running for extended periods
  // - Uptime pattern shows cyclic failures
  
  // Check if longer uptime correlates with more errors
  if (uptimePeriods.length >= 3 && errorLogs.length >= 3) {
    const uptimeErrorCorrelation = calculateUptimeErrorCorrelation(uptimePeriods, errorLogs);
    if (uptimeErrorCorrelation > 0.6) {
      memoryLeakLikelihood += 40;
    } else if (uptimeErrorCorrelation > 0.3) {
      memoryLeakLikelihood += 20;
    }
  }
  
  // Extended uptime
  if (averageUptime > MEMORY_LEAK_THRESHOLD_HOURS * 60) {
    const hoursOver = (averageUptime / 60) - MEMORY_LEAK_THRESHOLD_HOURS;
    memoryLeakLikelihood += Math.min(40, hoursOver * 0.8);
  }
  
  // If current uptime is very long and app is in bad state
  if (app.status !== AppStatus.RUNNING && uptimePeriods.length > 0) {
    const lastUptimePeriod = uptimePeriods[uptimePeriods.length - 1];
    if (lastUptimePeriod > MEMORY_LEAK_THRESHOLD_HOURS * 60) {
      memoryLeakLikelihood += 20;
    }
  }
  
  // Cap at 100
  memoryLeakLikelihood = Math.min(100, memoryLeakLikelihood);
  
  // Calculate ghost process metrics
  const ghostProcessDetections = ghostProcessLogs.filter(log => 
    log.action.includes("Ghost Process Cleanup Attempt") || 
    log.action.includes("Ghost Process Detected")
  ).length;
  
  const ghostProcessTerminations = ghostProcessLogs.filter(log => 
    log.action.includes("Process Terminated")
  ).length;
  
  const hasGhostProcesses = ghostProcessDetections > 0;
  
  // Return the complete health metrics
  return {
    // Basic metrics
    failureRate,
    averageUptime,
    restartFrequency,
    statusTransitions,
    errorOccurrences: errorLogs.length,
    lastRestarted,
    
    // Advanced metrics
    errorFrequencyTrend,
    timeBasedPatterns,
    errorDensity,
    uptimeStability,
    performanceDegradation,
    memoryLeakLikelihood,
    daysSinceLastRestart,
    
    // Ghost process metrics
    ghostProcessDetections,
    ghostProcessTerminations,
    hasGhostProcesses
  };
}

/**
 * Calculate correlation between uptime length and error occurrence
 * Returns a correlation coefficient between -1 and 1
 */
function calculateUptimeErrorCorrelation(uptimePeriods: number[], errorLogs: LogEntry[]): number {
  // If we don't have enough data, return 0 (no correlation)
  if (uptimePeriods.length < 3 || errorLogs.length < 3) return 0;
  
  // Sort uptime periods
  uptimePeriods.sort((a, b) => a - b);
  
  // Divide uptime periods into bins (short, medium, long)
  const shortThreshold = uptimePeriods[Math.floor(uptimePeriods.length / 3)];
  const longThreshold = uptimePeriods[Math.floor(uptimePeriods.length * 2 / 3)];
  
  // Count errors per uptime duration bin
  let shortUptimeErrors = 0;
  let mediumUptimeErrors = 0;
  let longUptimeErrors = 0;
  
  // For simplicity, assume timestamp order correlation in the logs
  // More sophisticated analysis would track specific uptime sessions
  let runningUptime = 0;
  
  for (const log of errorLogs) {
    const timestamp = new Date(log.timestamp).getTime();
    
    // Estimate which uptime period this error belongs to
    // (This is a simplification - a real implementation would track session IDs)
    if (runningUptime < shortThreshold) {
      shortUptimeErrors++;
    } else if (runningUptime < longThreshold) {
      mediumUptimeErrors++;
    } else {
      longUptimeErrors++;
    }
    
    runningUptime += 10; // Simulated advancement in uptime (10 minutes)
  }
  
  // Normalize by number of periods in each bin
  const shortPeriods = uptimePeriods.filter(u => u <= shortThreshold).length;
  const mediumPeriods = uptimePeriods.filter(u => u > shortThreshold && u <= longThreshold).length;
  const longPeriods = uptimePeriods.filter(u => u > longThreshold).length;
  
  // Calculate error density per bin
  const shortDensity = shortPeriods > 0 ? shortUptimeErrors / shortPeriods : 0;
  const mediumDensity = mediumPeriods > 0 ? mediumUptimeErrors / mediumPeriods : 0;
  const longDensity = longPeriods > 0 ? longUptimeErrors / longPeriods : 0;
  
  // Calculate trend (positive means more errors with longer uptime)
  // Using simplified correlation calculation
  if (shortDensity === 0 && mediumDensity === 0 && longDensity === 0) return 0;
  
  // Check if there's a clear pattern of increasing errors with uptime
  if (longDensity > mediumDensity && mediumDensity > shortDensity) {
    // Strong positive correlation
    return 0.8;
  } else if (longDensity > shortDensity) {
    // Moderate positive correlation
    return 0.5;
  } else if (shortDensity > longDensity) {
    // Negative correlation (errors happen early)
    return -0.5;
  }
  
  // No clear pattern
  return 0;
}

/**
 * Predict failure probability for a specific time slot
 */
function predictFailureForTimeSlot(
  app: ReplitApp, 
  healthMetrics: AppHealthMetrics, 
  timeSlot: Date, 
  logs: LogEntry[]
): {
  failureProbability: number;
  confidenceScore: number;
  predictedMetrics?: {
    responseTime?: number;
    errorRate?: number;
    availabilityPercent?: number;
    resourceUtilization?: number;
  };
  contributingFactors: string[];
} {
  // Start with baseline probability based on current app status
  let failureProbability = 0;
  const confidenceFactors: number[] = [];
  const contributingFactors: string[] = [];
  
  // 1. Base probability on app status
  if (app.status === AppStatus.ERROR) {
    failureProbability += 0.8;
    confidenceFactors.push(90);
    contributingFactors.push("Current error state");
  } else if (app.status === AppStatus.UNREACHABLE) {
    failureProbability += 0.9;
    confidenceFactors.push(95);
    contributingFactors.push("Currently unreachable");
  } else if (app.status === AppStatus.STOPPED) {
    failureProbability += 0.1;
    confidenceFactors.push(80);
    contributingFactors.push("Currently stopped");
  }
  
  // 2. Add probability based on failure rate
  if (healthMetrics.failureRate > HIGH_FAILURE_RATE) {
    failureProbability += 0.3 * FAILURE_HISTORY_WEIGHT;
    confidenceFactors.push(85);
    contributingFactors.push("High historical failure rate");
  } else if (healthMetrics.failureRate > MEDIUM_FAILURE_RATE) {
    failureProbability += 0.15 * FAILURE_HISTORY_WEIGHT;
    confidenceFactors.push(75);
    contributingFactors.push("Moderate historical failure rate");
  }
  
  // 3. Check for memory leak patterns
  if (healthMetrics.memoryLeakLikelihood > 70) {
    const predictedUptimeAtTimeSlot = healthMetrics.averageUptime + 
      ((timeSlot.getTime() - new Date().getTime()) / (1000 * 60));
    
    // Higher memory leak probability with longer uptime
    const memoryLeakFactor = Math.min(0.8, (healthMetrics.memoryLeakLikelihood / 100) * MEMORY_LEAK_WEIGHT);
    
    // Adjust based on projected uptime
    const uptimeHours = predictedUptimeAtTimeSlot / 60;
    if (uptimeHours > MEMORY_LEAK_THRESHOLD_HOURS * 1.5) {
      failureProbability += memoryLeakFactor;
      confidenceFactors.push(80);
      contributingFactors.push("Predicted memory leak");
    } else if (uptimeHours > MEMORY_LEAK_THRESHOLD_HOURS) {
      failureProbability += memoryLeakFactor * 0.7;
      confidenceFactors.push(70);
      contributingFactors.push("Potential memory leak");
    }
  }
  
  // 4. Check for time-based failure patterns
  const timeSlotHour = timeSlot.getHours();
  const timeSlotDay = timeSlot.getDay();
  
  const matchingTimePattern = healthMetrics.timeBasedPatterns.find(pattern => 
    pattern.timeOfDay === timeSlotHour && pattern.dayOfWeek === timeSlotDay
  );
  
  if (matchingTimePattern) {
    // Time pattern matching this time slot
    const patternFactor = (matchingTimePattern.failureRate / 100) * 
      (matchingTimePattern.confidence / 100) * TIME_PATTERN_WEIGHT;
    
    failureProbability += patternFactor;
    confidenceFactors.push(matchingTimePattern.confidence);
    contributingFactors.push("Time-based failure pattern match");
  }
  
  // 5. Error frequency trend
  if (healthMetrics.errorFrequencyTrend === 'increasing') {
    failureProbability += 0.2 * RECENCY_WEIGHT;
    confidenceFactors.push(75);
    contributingFactors.push("Increasing error frequency");
  }
  
  // 6. Performance degradation
  if (healthMetrics.performanceDegradation > 50) {
    failureProbability += 0.3;
    confidenceFactors.push(80);
    contributingFactors.push("Significant performance degradation");
  } else if (healthMetrics.performanceDegradation > 25) {
    failureProbability += 0.15;
    confidenceFactors.push(70);
    contributingFactors.push("Moderate performance degradation");
  }
  
  // 7. Error density
  if (healthMetrics.errorDensity > 2) {
    failureProbability += 0.25;
    confidenceFactors.push(80);
    contributingFactors.push("High error density");
  } else if (healthMetrics.errorDensity > 1) {
    failureProbability += 0.15;
    confidenceFactors.push(75);
    contributingFactors.push("Moderate error density");
  }
  
  // 8. Days since last restart 
  if (healthMetrics.daysSinceLastRestart > PERIODIC_RESTART_INTERVAL_DAYS * 2) {
    failureProbability += 0.2;
    confidenceFactors.push(70);
    contributingFactors.push("Extended period without restart");
  } else if (healthMetrics.daysSinceLastRestart > PERIODIC_RESTART_INTERVAL_DAYS) {
    failureProbability += 0.1;
    confidenceFactors.push(60);
    contributingFactors.push("Due for routine restart");
  }
  
  // Cap probability at 1.0
  failureProbability = Math.min(1.0, failureProbability);
  
  // Calculate average confidence score
  const confidenceScore = confidenceFactors.length > 0 
    ? confidenceFactors.reduce((sum, score) => sum + score, 0) / confidenceFactors.length 
    : 50; // Default confidence if no factors
  
  // Generate predicted metrics based on failure probability
  let predictedMetrics;
  
  if (failureProbability > 0.3) {
    const availabilityImpact = 1 - failureProbability;
    const responseTimeMultiplier = 1 + (failureProbability * 2); // Up to 3x slower
    const errorRateMultiplier = failureProbability * 100; // Up to 100% errors
    
    predictedMetrics = {
      responseTime: app.averageResponseTime ? Math.round(app.averageResponseTime * responseTimeMultiplier) : undefined,
      errorRate: Math.round(errorRateMultiplier),
      availabilityPercent: Math.round(availabilityImpact * 100),
      resourceUtilization: app.resourceUsage ? Math.min(100, Math.round(app.resourceUsage * (1 + failureProbability))) : undefined
    };
  }
  
  return {
    failureProbability,
    confidenceScore,
    predictedMetrics,
    contributingFactors
  };
}

/**
 * Identify high-risk time periods from prediction time slots
 */
function identifyHighRiskPeriods(predictionTimeSlots: FailurePredictionTimeSlot[]): {
  startTime: Date;
  endTime: Date;
  risk: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}[] {
  const highRiskPeriods: {
    startTime: Date;
    endTime: Date;
    risk: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }[] = [];
  
  // Sort slots by probability
  const sortedSlots = [...predictionTimeSlots].sort((a, b) => 
    b.failureProbability - a.failureProbability
  );
  
  // Get the top risk periods
  for (const slot of sortedSlots) {
    // Only include slots with significant probability
    if (slot.failureProbability >= FAILURE_PROBABILITY_THRESHOLD) {
      // Determine risk level
      let risk: 'low' | 'medium' | 'high' | 'critical' = 'low';
      
      if (slot.failureProbability >= 0.9) {
        risk = 'critical';
      } else if (slot.failureProbability >= 0.7) {
        risk = 'high';
      } else if (slot.failureProbability >= 0.5) {
        risk = 'medium';
      }
      
      // Create description
      const formattedStart = formatTime(slot.startTime);
      const formattedEnd = formatTime(slot.endTime);
      const probability = Math.round(slot.failureProbability * 100);
      
      let description = `${probability}% failure probability between ${formattedStart} and ${formattedEnd}`;
      
      if (slot.contributingFactors.length > 0) {
        description += ` due to ${slot.contributingFactors[0]}`;
        
        if (slot.contributingFactors.length > 1) {
          description += ` and ${slot.contributingFactors.length - 1} other factor(s)`;
        }
      }
      
      highRiskPeriods.push({
        startTime: slot.startTime,
        endTime: slot.endTime,
        risk,
        description
      });
    }
  }
  
  // Return periods sorted by start time
  return highRiskPeriods.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}

/**
 * Generate recommended actions to mitigate predicted failures
 */
function generateRecommendedActions(
  app: ReplitApp,
  healthMetrics: AppHealthMetrics,
  predictionTimeSlots: FailurePredictionTimeSlot[],
  aggregatedFailureProbability: number
): string[] {
  const actions: string[] = [];
  
  // 1. Check if restart is most critical action
  if (aggregatedFailureProbability > 0.7 || app.status === AppStatus.ERROR || app.status === AppStatus.UNREACHABLE) {
    actions.push("Immediately restart the application to prevent imminent failure");
  } else if (aggregatedFailureProbability > 0.5) {
    actions.push("Schedule an application restart within the next few hours");
  } else if (healthMetrics.daysSinceLastRestart > PERIODIC_RESTART_INTERVAL_DAYS) {
    actions.push(`Schedule a preventative restart (${Math.round(healthMetrics.daysSinceLastRestart)} days since last restart)`);
  }
  
  // 2. Check for memory leak
  if (healthMetrics.memoryLeakLikelihood > 60) {
    actions.push("Investigate potential memory leak in application code");
    
    if (app.type === 'Backend') {
      actions.push("Consider implementing memory usage monitoring and automatic restart policies");
    }
  }
  
  // 3. Check for time-based patterns
  if (healthMetrics.timeBasedPatterns.length > 0) {
    const topPattern = healthMetrics.timeBasedPatterns[0];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    actions.push(`Monitor application closely during ${dayNames[topPattern.dayOfWeek]} at ${topPattern.timeOfDay}:00 (${Math.round(topPattern.failureRate)}% historical failure rate)`);
    
    if (topPattern.failureRate > HIGH_FAILURE_RATE) {
      actions.push("Consider scheduling preventative restarts before identified high-risk periods");
    }
  }
  
  // 4. General recommendations based on app type
  if (app.type === 'Frontend') {
    if (healthMetrics.performanceDegradation > 30) {
      actions.push("Check frontend application for memory leaks in components or event listeners");
    }
  } else if (app.type === 'Backend') {
    if (healthMetrics.errorFrequencyTrend === 'increasing') {
      actions.push("Check backend logs for increasing error rates and implement error handling improvements");
    }
    
    if (healthMetrics.performanceDegradation > 30) {
      actions.push("Monitor backend resource usage and optimize database queries");
    }
  } else if (app.type === 'Database') {
    if (healthMetrics.performanceDegradation > 20) {
      actions.push("Analyze database performance and consider query optimization");
    }
    
    if (healthMetrics.errorOccurrences > 3) {
      actions.push("Check database connection pool settings and error handling");
    }
  }
  
  // 5. Add scaling recommendation if consistently high utilization
  if (app.resourceUsage && app.resourceUsage > 80) {
    actions.push("Consider scaling resources to handle current load");
  }
  
  // Ensure we have at least one recommendation
  if (actions.length === 0) {
    actions.push("Continue monitoring application performance");
  }
  
  return actions;
}

/**
 * Helper function to format time for display
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Calculate recommendation score based on app health metrics
 */
function calculateRecommendationScore(app: ReplitApp, metrics: AppHealthMetrics): number {
  let score = 0;
  
  // === BASIC FACTORS ===
  
  // Factor 1: Higher failure rate indicates need for restart
  if (metrics.failureRate > HIGH_FAILURE_RATE) score += 20;
  else if (metrics.failureRate > MEDIUM_FAILURE_RATE) score += 10;
  else if (metrics.failureRate > 3) score += 5;
  
  // Factor 2: Too long uptime without restart
  if (metrics.averageUptime > MEMORY_LEAK_THRESHOLD_HOURS * 2 * 60) score += 15;
  else if (metrics.averageUptime > MEMORY_LEAK_THRESHOLD_HOURS * 60) score += 10;
  
  // Factor 3: Frequent status transitions may indicate instability
  if (metrics.statusTransitions > 10) score += 15;
  else if (metrics.statusTransitions > 5) score += 10;
  else if (metrics.statusTransitions > 2) score += 5;
  
  // Factor 4: Current status is not optimal
  if (app.status === AppStatus.UNREACHABLE) score += 25;
  else if (app.status === AppStatus.ERROR) score += 20;
  
  // Factor 5: Recent errors indicate issues
  if (metrics.errorOccurrences > 5) score += 10;
  else if (metrics.errorOccurrences > 2) score += 5;
  
  // === ADVANCED FACTORS ===
  
  // Factor 6: Memory leak likelihood
  if (metrics.memoryLeakLikelihood > 70) score += 25;
  else if (metrics.memoryLeakLikelihood > 40) score += 15;
  else if (metrics.memoryLeakLikelihood > 20) score += 5;
  
  // Factor 7: Error frequency trend
  if (metrics.errorFrequencyTrend === 'increasing') score += 20;
  
  // Factor 8: Performance degradation estimate
  if (metrics.performanceDegradation > 50) score += 20;
  else if (metrics.performanceDegradation > 25) score += 10;
  else if (metrics.performanceDegradation > 10) score += 5;
  
  // Factor 9: Time-based patterns detected
  if (metrics.timeBasedPatterns.length > 0) {
    const highConfidencePatterns = metrics.timeBasedPatterns.filter(p => p.confidence > 80);
    if (highConfidencePatterns.length > 0) {
      // Found strong time-based failure patterns
      score += 15;
      
      // If we're currently in one of those high-risk time periods, add extra urgency
      const now = new Date();
      const currentHour = now.getHours();
      const currentDay = now.getDay();
      
      const inHighRiskPeriod = highConfidencePatterns.some(p => 
        p.timeOfDay === currentHour && p.dayOfWeek === currentDay
      );
      
      if (inHighRiskPeriod) {
        score += 15; // Extra score if we're in a historically bad time period
      }
    } else if (metrics.timeBasedPatterns.length > 0) {
      // Some patterns, but not super high confidence
      score += 10;
    }
  }
  
  // Factor 10: Days since last restart
  if (metrics.daysSinceLastRestart > PERIODIC_RESTART_INTERVAL_DAYS * 2) score += 15;
  else if (metrics.daysSinceLastRestart > PERIODIC_RESTART_INTERVAL_DAYS) score += 10;
  
  // Factor 11: Error density (errors per hour of operation)
  if (metrics.errorDensity > 2.0) score += 15; // More than 2 errors per hour
  else if (metrics.errorDensity > 1.0) score += 10;
  else if (metrics.errorDensity > 0.5) score += 5;
  
  // Factor 12: Uptime stability (high variation indicates instability)
  if (metrics.uptimeStability > 0.8) score += 10;
  else if (metrics.uptimeStability > 0.5) score += 5;
  
  // Cap score at 100
  return Math.min(100, score);
}

/**
 * Determine reason for restart recommendation
 */
function determineRestartReason(app: ReplitApp, metrics: AppHealthMetrics, score: number): string {
  // Get current time to contextualize recommendations
  const now = new Date();
  const currentHour = now.getHours();
  const isBusinessHours = currentHour >= PEAK_HOURS_START && currentHour <= PEAK_HOURS_END;
  
  // Determine critical reasons first (these clearly need immediate action)
  if (app.status === AppStatus.UNREACHABLE || app.status === AppStatus.ERROR) {
    return `App is in ${app.status} state and requires immediate attention. A restart is recommended to restore functionality.`;
  }
  
  // Check for memory leak evidence (highest priority after critical errors)
  if (metrics.memoryLeakLikelihood > 70) {
    return `High likelihood of memory leak detected (${metrics.memoryLeakLikelihood.toFixed(0)}%). App has been running for ${(metrics.averageUptime / 60).toFixed(1)} hours and shows increasing error rates over time. A restart will free up memory resources.`;
  }
  
  // Check for time-based patterns that indicate imminent risk
  if (metrics.timeBasedPatterns.length > 0) {
    const highConfidencePatterns = metrics.timeBasedPatterns.filter(p => p.confidence > 80);
    
    if (highConfidencePatterns.length > 0) {
      // Check if we're currently in one of those high-risk time periods
      const currentHour = now.getHours();
      const currentDay = now.getDay();
      
      const riskPattern = highConfidencePatterns.find(p => 
        p.timeOfDay === currentHour && p.dayOfWeek === currentDay
      );
      
      if (riskPattern) {
        // We're in a high-risk period now
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return `App is currently in a high-risk time period (${dayNames[currentDay]} at ${currentHour}:00) with historical failure rate of ${riskPattern.failureRate.toFixed(1)}%. Preemptive restart is recommended to prevent likely failures.`;
      } else {
        // Not in high-risk period now, but have identified patterns
        const upcomingPattern = highConfidencePatterns.find(p => {
          // Find patterns in the next few hours
          if (p.dayOfWeek === currentDay && p.timeOfDay > currentHour && p.timeOfDay <= currentHour + 3) {
            return true;
          }
          return false;
        });
        
        if (upcomingPattern) {
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          return `App shows a pattern of failures approaching soon (${dayNames[upcomingPattern.dayOfWeek]} at ${upcomingPattern.timeOfDay}:00). Recommended preemptive restart to prevent likely issues.`;
        }
      }
    }
  }
  
  // Check for significant performance degradation
  if (metrics.performanceDegradation > 40) {
    return `App performance has degraded by approximately ${metrics.performanceDegradation.toFixed(0)}% based on error patterns and response metrics. A restart will likely restore optimal performance.`;
  }
  
  // Check high error frequency that's increasing
  if (metrics.failureRate > HIGH_FAILURE_RATE && metrics.errorFrequencyTrend === 'increasing') {
    return `App is showing increasing error rates, currently at ${metrics.failureRate.toFixed(1)}%. This trend suggests worsening conditions that a restart may resolve.`;
  }
  
  // Check for extended uptime concerns
  if (metrics.daysSinceLastRestart > PERIODIC_RESTART_INTERVAL_DAYS * 2) {
    const days = Math.floor(metrics.daysSinceLastRestart);
    const recommended = PERIODIC_RESTART_INTERVAL_DAYS;
    return `App has been running for ${days} days without restart (recommended maximum is ${recommended} days). Preventative restart will help avoid resource depletion issues.`;
  }
  
  // Check for high failure rate
  if (metrics.failureRate > HIGH_FAILURE_RATE) {
    return `High failure rate detected (${metrics.failureRate.toFixed(1)}%) indicating app instability. A restart may resolve underlying issues.`;
  }
  
  // Check for extended uptime that might lead to memory issues
  if (metrics.averageUptime > MEMORY_LEAK_THRESHOLD_HOURS * 60) {
    return `App has been running for ${(metrics.averageUptime / 60).toFixed(1)} hours without restart, which may lead to memory leaks or resource exhaustion. Preventative restart recommended.`;
  }
  
  // Check for erratic behavior
  if (metrics.statusTransitions > 5 && metrics.uptimeStability > 0.5) {
    return `App has shown unstable behavior with ${metrics.statusTransitions} status transitions and irregular uptime patterns. A restart may help stabilize operation.`;
  }
  
  // Check for error density
  if (metrics.errorDensity > 1.0) {
    return `App is experiencing a high error density of ${metrics.errorDensity.toFixed(1)} errors per hour of operation. A restart may clear temporary error conditions.`;
  }
  
  if (metrics.errorOccurrences > 3) {
    return `App has encountered ${metrics.errorOccurrences} errors recently, suggesting resource issues or temporary failure states. A restart is likely to resolve these issues.`;
  }
  
  // Check for business hour considerations
  if (isBusinessHours && metrics.failureRate > MEDIUM_FAILURE_RATE) {
    return `During business hours, the app is showing elevated error rates (${metrics.failureRate.toFixed(1)}%). A proactive restart is recommended to maintain reliability during peak usage.`;
  }
  
  // Fallback generic reason with more context
  return `System analysis indicates a restart may improve performance (Score: ${score}/100). Periodic restarts are recommended as a best practice even for stable applications.`;
}