import { ReplitApp, AppStatus, LogEntry } from "@shared/schema";
import { storage } from "../storage";

/**
 * Interface for restart recommendation
 */
interface RestartRecommendation {
  appId: number;
  appName: string;
  recommendationScore: number; // 0-100, higher means stronger recommendation
  reason: string;
  lastRestarted: Date | null;
  statusHistory: string[];
  uptime: number; // in minutes
}

/**
 * Interface for app health metrics
 */
interface AppHealthMetrics {
  failureRate: number; // percentage of failed status checks
  averageUptime: number; // average uptime in minutes
  restartFrequency: number; // average number of restarts per day
  statusTransitions: number; // number of status changes (running <-> stopped)
  errorOccurrences: number; // count of error status occurrences
  lastRestarted: Date | null;
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
    
    return {
      appId: app.id,
      appName: app.name,
      recommendationScore,
      reason,
      lastRestarted: healthMetrics.lastRestarted,
      statusHistory,
      uptime: healthMetrics.averageUptime
    };
  } catch (error) {
    console.error(`Error analyzing app ${app.id}:`, error);
    return null;
  }
}

/**
 * Calculate health metrics for an app
 */
async function calculateAppHealthMetrics(app: ReplitApp, logs: LogEntry[]): Promise<AppHealthMetrics> {
  // Filter relevant logs
  const statusLogs = logs.filter(log => log.action === "Status Change");
  const restartLogs = logs.filter(log => 
    log.action.includes("Restart") || 
    log.action === "Started" || 
    log.action === "Stopped"
  );
  const errorLogs = logs.filter(log => 
    log.action.includes("Error") || 
    log.action.includes("Failed") || 
    log.status === AppStatus.ERROR || 
    log.status === AppStatus.UNREACHABLE
  );
  
  // Calculate metrics
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
  
  // Calculate uptime
  let totalUptime = 0;
  let uptimeCount = 0;
  let startTime: Date | null = null;
  
  for (const log of statusLogs) {
    if (log.status === AppStatus.RUNNING && !startTime) {
      startTime = new Date(log.timestamp);
    } else if (log.status !== AppStatus.RUNNING && startTime) {
      const endTime = new Date(log.timestamp);
      const uptimeMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
      totalUptime += uptimeMinutes;
      uptimeCount++;
      startTime = null;
    }
  }
  
  // If app is currently running, calculate current uptime
  if (startTime && app.status === AppStatus.RUNNING) {
    const now = new Date();
    const currentUptimeMinutes = (now.getTime() - startTime.getTime()) / (1000 * 60);
    totalUptime += currentUptimeMinutes;
    uptimeCount++;
  }
  
  const averageUptime = uptimeCount > 0 ? totalUptime / uptimeCount : 0;
  
  // Calculate restart frequency (restarts per day)
  const timeSpan = logs.length > 0 ? 
    (new Date().getTime() - new Date(logs[logs.length - 1].timestamp).getTime()) / (1000 * 60 * 60 * 24) : 1;
  const restartFrequency = timeSpan > 0 ? restartLogs.filter(log => log.action.includes("Restart")).length / timeSpan : 0;
  
  return {
    failureRate,
    averageUptime,
    restartFrequency,
    statusTransitions,
    errorOccurrences: errorLogs.length,
    lastRestarted
  };
}

/**
 * Calculate recommendation score based on app health metrics
 */
function calculateRecommendationScore(app: ReplitApp, metrics: AppHealthMetrics): number {
  let score = 0;
  
  // Factor 1: Higher failure rate indicates need for restart
  if (metrics.failureRate > 20) score += 25;
  else if (metrics.failureRate > 10) score += 15;
  else if (metrics.failureRate > 5) score += 10;
  
  // Factor 2: Too long uptime without restart (>48 hours)
  if (metrics.averageUptime > 48 * 60) score += 20;
  else if (metrics.averageUptime > 24 * 60) score += 15;
  else if (metrics.averageUptime > 12 * 60) score += 10;
  
  // Factor 3: Frequent status transitions may indicate instability
  if (metrics.statusTransitions > 10) score += 20;
  else if (metrics.statusTransitions > 5) score += 15;
  else if (metrics.statusTransitions > 2) score += 10;
  
  // Factor 4: Current status is not optimal
  if (app.status === AppStatus.UNREACHABLE) score += 30;
  else if (app.status === AppStatus.ERROR) score += 25;
  
  // Factor 5: Recent errors indicate issues
  if (metrics.errorOccurrences > 5) score += 15;
  else if (metrics.errorOccurrences > 2) score += 10;
  
  // Cap score at 100
  return Math.min(100, score);
}

/**
 * Determine reason for restart recommendation
 */
function determineRestartReason(app: ReplitApp, metrics: AppHealthMetrics, score: number): string {
  // Determine primary reason based on metrics and score
  if (app.status === AppStatus.UNREACHABLE || app.status === AppStatus.ERROR) {
    return `App is in ${app.status} state and requires attention.`;
  }
  
  if (metrics.failureRate > 20) {
    return `High failure rate (${metrics.failureRate.toFixed(1)}%) indicates app instability.`;
  }
  
  if (metrics.averageUptime > 48 * 60) {
    return `App has been running for ${(metrics.averageUptime / 60).toFixed(1)} hours without restart, which may lead to memory leaks.`;
  }
  
  if (metrics.statusTransitions > 5) {
    return `App has shown unstable behavior with ${metrics.statusTransitions} status transitions.`;
  }
  
  if (metrics.errorOccurrences > 3) {
    return `App has encountered ${metrics.errorOccurrences} errors, suggesting potential resource issues.`;
  }
  
  // Fallback generic reason
  return `System analysis indicates a restart may improve performance (Score: ${score}/100).`;
}