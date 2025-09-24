import { apiRequest } from "@/lib/queryClient";
import { InsertApp, UpdateSettings } from "@shared/schema";

// App API
export async function getApps() {
  const res = await apiRequest("/api/apps");
  return res.json();
}

export async function getApp(id: number) {
  const res = await apiRequest(`/api/apps/${id}`);
  return res.json();
}

export async function createApp(app: InsertApp) {
  const res = await apiRequest("/api/apps", {
    method: "POST",
    data: app
  });
  return res.json();
}

export async function updateApp(id: number, updates: Partial<any>) {
  const res = await apiRequest(`/api/apps/${id}`, {
    method: "PATCH", 
    data: updates
  });
  return res.json();
}

export async function deleteApp(id: number) {
  const res = await apiRequest(`/api/apps/${id}`, {
    method: "DELETE"
  });
  return res.json();
}

export async function startApp(id: number) {
  const res = await apiRequest(`/api/apps/${id}/start`, {
    method: "POST"
  });
  return res.json();
}

export async function stopApp(id: number) {
  const res = await apiRequest(`/api/apps/${id}/stop`, {
    method: "POST"
  });
  return res.json();
}

export async function restartApp(id: number) {
  const res = await apiRequest(`/api/apps/${id}/restart`, {
    method: "POST"
  });
  return res.json();
}

export async function getAppLogs(id: number) {
  const res = await apiRequest(`/api/apps/${id}/logs`);
  return res.json();
}

// Settings API
export async function getSettings() {
  const res = await apiRequest("/api/settings");
  return res.json();
}

export async function updateSettings(settings: Partial<UpdateSettings>) {
  const res = await apiRequest("/api/settings", {
    method: "PATCH", 
    data: settings
  });
  return res.json();
}

// Stats API
export async function getStats() {
  const res = await apiRequest("/api/stats");
  return res.json();
}

// Logs API
export async function getLogs() {
  const res = await apiRequest("/api/logs");
  return res.json();
}

// Recommendation engine API
export interface RestartRecommendation {
  appId: number;
  appName: string;
  recommendationScore: number; // 0-100, higher means stronger recommendation
  reason: string;
  lastRestarted: Date | null;
  statusHistory: string[];
  uptime: number; // in minutes
  
  // Advanced fields from enhanced recommendation engine
  primaryFactor?: string; // Main reason for recommendation
  urgency?: 'low' | 'medium' | 'high' | 'critical'; // How urgent is this restart
  predictedIssues?: string[]; // What might happen if not restarted
  recommendedTimeWindow?: string; // When should this restart happen
  memoryLeakLikelihood?: number; // Probability of memory leak (0-100)
  
  // Advanced insights and analysis
  insights?: string[]; // Additional insights from advanced analysis
  confidenceScore?: number; // Confidence in the recommendation (0-100)
  alternativeSolutions?: string[]; // Alternative solutions
}

export async function getRestartRecommendations() {
  const res = await apiRequest("/api/recommendations");
  const data = await res.json();
  
  // Convert string dates to Date objects
  return data.map((recommendation: any) => ({
    ...recommendation,
    lastRestarted: recommendation.lastRestarted ? new Date(recommendation.lastRestarted) : null
  }));
}

export async function getAppRestartRecommendation(id: number) {
  const res = await apiRequest(`/api/apps/${id}/recommendation`);
  const recommendation = await res.json();
  
  // Convert string dates to Date objects
  return {
    ...recommendation,
    lastRestarted: recommendation.lastRestarted ? new Date(recommendation.lastRestarted) : null
  };
}

// Prediction API functions
export interface FailurePredictionTimeSlot {
  startTime: Date;
  endTime: Date;
  failureProbability: number; // 0-1
  confidenceScore: number; // 0-100
  predictedMetrics?: {
    responseTime?: number;
    errorRate?: number;
    availabilityPercent?: number;
    resourceUtilization?: number;
  };
  contributingFactors: string[];
}

export interface AppPredictionModel {
  appId: number;
  appName: string;
  predictionGenerated: Date;
  predictionTimeSlots: FailurePredictionTimeSlot[];
  aggregatedFailureProbability: number; // 0-1
  recommendedActions: string[];
  highRiskPeriods: {
    startTime: Date;
    endTime: Date;
    risk: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }[];
}

export async function getAllPredictions() {
  const res = await apiRequest("/api/predictions");
  const data = await res.json();
  
  // Convert string dates to Date objects
  return data.map((prediction: any) => ({
    ...prediction,
    predictionGenerated: new Date(prediction.predictionGenerated),
    predictionTimeSlots: prediction.predictionTimeSlots.map((slot: any) => ({
      ...slot,
      startTime: new Date(slot.startTime),
      endTime: new Date(slot.endTime)
    })),
    highRiskPeriods: prediction.highRiskPeriods.map((period: any) => ({
      ...period,
      startTime: new Date(period.startTime),
      endTime: new Date(period.endTime)
    }))
  }));
}

export async function getAppPrediction(id: number) {
  const res = await apiRequest(`/api/apps/${id}/prediction`);
  const prediction = await res.json();
  
  // Convert string dates to Date objects
  return {
    ...prediction,
    predictionGenerated: prediction.predictionGenerated ? new Date(prediction.predictionGenerated) : null,
    predictionTimeSlots: prediction.predictionTimeSlots ?
      prediction.predictionTimeSlots.map((slot: any) => ({
        ...slot,
        startTime: new Date(slot.startTime),
        endTime: new Date(slot.endTime)
      })) : [],
    highRiskPeriods: prediction.highRiskPeriods ?
      prediction.highRiskPeriods.map((period: any) => ({
        ...period,
        startTime: new Date(period.startTime),
        endTime: new Date(period.endTime)
      })) : []
  };
}

// Endpoints API
export async function getEndpoints() {
  const res = await apiRequest("/api/endpoints");
  return res.json();
}

export async function getAppEndpoints(appId: number) {
  const res = await apiRequest(`/api/apps/${appId}/endpoints`);
  return res.json();
}

export async function getEndpoint(id: number) {
  const res = await apiRequest(`/api/endpoints/${id}`);
  return res.json();
}

export async function createEndpoint(endpoint: any) {
  const res = await apiRequest("/api/endpoints", {
    method: "POST",
    data: endpoint
  });
  return res.json();
}

export async function updateEndpoint(id: number, updates: any) {
  const res = await apiRequest(`/api/endpoints/${id}`, {
    method: "PATCH",
    data: updates
  });
  return res.json();
}

export async function deleteEndpoint(id: number) {
  const res = await apiRequest(`/api/endpoints/${id}`, {
    method: "DELETE"
  });
  return res.json();
}

// Ports API
export async function getPorts() {
  const res = await apiRequest("/api/ports");
  return res.json();
}

export async function getAppPorts(appId: number) {
  const res = await apiRequest(`/api/apps/${appId}/ports`);
  return res.json();
}

export async function checkPortAvailability(port: number) {
  const res = await apiRequest(`/api/ports/check/${port}`);
  return res.json();
}

// Processes API
export async function getProcesses() {
  const res = await apiRequest("/api/processes");
  return res.json();
}

export async function getAppProcesses(appId: number) {
  const res = await apiRequest(`/api/apps/${appId}/processes`);
  return res.json();
}

export async function terminateGhostProcesses(appId: number) {
  const res = await apiRequest(`/api/apps/${appId}/terminate-ghost-processes`, {
    method: "POST"
  });
  return res.json();
}

// Email API
export async function sendTestEmail(email: string) {
  const res = await apiRequest("/api/email/test", {
    method: "POST",
    data: { email }
  });
  return res.json();
}
