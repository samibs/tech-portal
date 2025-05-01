import { apiRequest } from "@/lib/queryClient";
import { InsertApp, UpdateSettings } from "@shared/schema";

// App API
export async function getApps() {
  const res = await apiRequest("GET", "/api/apps");
  return res.json();
}

export async function getApp(id: number) {
  const res = await apiRequest("GET", `/api/apps/${id}`);
  return res.json();
}

export async function createApp(app: InsertApp) {
  const res = await apiRequest("POST", "/api/apps", app);
  return res.json();
}

export async function updateApp(id: number, updates: Partial<any>) {
  const res = await apiRequest("PATCH", `/api/apps/${id}`, updates);
  return res.json();
}

export async function deleteApp(id: number) {
  const res = await apiRequest("DELETE", `/api/apps/${id}`);
  return res.json();
}

export async function startApp(id: number) {
  const res = await apiRequest("POST", `/api/apps/${id}/start`);
  return res.json();
}

export async function stopApp(id: number) {
  const res = await apiRequest("POST", `/api/apps/${id}/stop`);
  return res.json();
}

export async function restartApp(id: number) {
  const res = await apiRequest("POST", `/api/apps/${id}/restart`);
  return res.json();
}

export async function getAppLogs(id: number) {
  const res = await apiRequest("GET", `/api/apps/${id}/logs`);
  return res.json();
}

// Settings API
export async function getSettings() {
  const res = await apiRequest("GET", "/api/settings");
  return res.json();
}

export async function updateSettings(settings: Partial<UpdateSettings>) {
  const res = await apiRequest("PATCH", "/api/settings", settings);
  return res.json();
}

// Stats API
export async function getStats() {
  const res = await apiRequest("GET", "/api/stats");
  return res.json();
}

// Logs API
export async function getLogs() {
  const res = await apiRequest("GET", "/api/logs");
  return res.json();
}
