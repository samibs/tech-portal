import { Notification } from "@/contexts/NotificationContext";
import { AppStatus, WebApp } from "@shared/schema";
import { AppPredictionModel } from "@/lib/api";

type NotificationData = Omit<Notification, "id" | "timestamp" | "read">;

/**
 * Generates a notification when an app changes status
 */
export function generateStatusChangeNotification(
  app: WebApp,
  previousStatus: AppStatus,
  newStatus: AppStatus
): NotificationData | null {
  // Skip if status is the same
  if (previousStatus === newStatus) {
    return null;
  }

  let title = "";
  let message = "";
  let type: NotificationData["type"] = "info";

  switch (newStatus) {
    case "Running":
      title = `${app.name} is now running`;
      message = `The application ${app.name} has started and is now running.`;
      type = "success";
      break;
    case "Stopped":
      title = `${app.name} has stopped`;
      message = `The application ${app.name} has stopped running.`;
      type = "info";
      break;
    case "Unreachable":
      title = `${app.name} is unreachable`;
      message = `The application ${app.name} can't be reached. It might be offline or experiencing network issues.`;
      type = "warning";
      break;
    case "Error":
      title = `${app.name} has encountered an error`;
      message = `The application ${app.name} is reporting an error state. Immediate attention may be required.`;
      type = "error";
      break;
    default:
      title = `${app.name} status changed`;
      message = `The application ${app.name} status has changed from ${previousStatus} to ${newStatus}.`;
      type = "info";
      break;
  }

  return {
    title,
    message,
    type,
    appId: app.id,
    link: `/applications`
  };
}

/**
 * Generates a notification for a critical risk prediction
 */
export function generatePredictionNotification(
  prediction: AppPredictionModel,
  riskThreshold: number = 0.7
): NotificationData | null {
  // Only notify if the risk is high
  if (prediction.aggregatedFailureProbability < riskThreshold) {
    return null;
  }

  const riskPercentage = Math.round(prediction.aggregatedFailureProbability * 100);
  
  const title = `High failure risk detected for ${prediction.appName}`;
  const message = `Our prediction system has detected a ${riskPercentage}% probability of failure for ${prediction.appName} in the next 24 hours.`;
  
  return {
    title,
    message,
    type: "warning",
    appId: prediction.appId,
    link: `/predictions/${prediction.appId}`
  };
}

/**
 * Generates a notification for a restart recommendation
 */
export function generateRestartRecommendationNotification(
  appName: string,
  appId: number,
  score: number,
  reason: string
): NotificationData | null {
  // Only notify if the recommendation score is significant
  if (score < 60) {
    return null;
  }

  const title = `Restart recommended for ${appName}`;
  const message = `Our system recommends restarting ${appName}. Reason: ${reason}`;
  
  return {
    title,
    message,
    type: score >= 80 ? "error" : "warning",
    appId,
    link: `/applications`
  };
}

/**
 * Generates a notification for a system event (like monitoring service status change)
 */
export function generateSystemNotification(
  title: string,
  message: string,
  type: NotificationData["type"] = "info"
): NotificationData {
  return {
    title,
    message,
    type
  };
}
