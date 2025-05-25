import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/contexts/NotificationContext";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  generateStatusChangeNotification,
  generatePredictionNotification,
  generateRestartRecommendationNotification,
  generateSystemNotification
} from "@/services/notification-service";
import { WebApp, AppStatus } from "@shared/schema";
import { AppPredictionModel } from "@/lib/api";

/**
 * A demo component to test the notification system with sample notifications.
 * In a real application, notifications would be generated from actual events.
 */
export default function NotificationDemo() {
  const { addNotification } = useNotifications();
  const [activeTab, setActiveTab] = useState("status");
  
  // Demo app for status notifications
  const demoApp: WebApp = {
    id: 999,
    name: "Demo Application",
    appUrl: "https://demo.sample.app",
    port: 3000,
    type: "Frontend",
    status: AppStatus.STOPPED,
    startCommand: "npm start",
    createdAt: new Date(),
    lastChecked: new Date(),
    lastLogs: null,
    averageResponseTime: null,
    uptime: null,
    errorRate: null,
    additionalPorts: null,
    checkForGhostProcesses: false,
    healthCheckPath: null,
    resourceUsage: null,
    lastRestarted: null
  };
  
  // Demo prediction for prediction notifications
  const demoPrediction: AppPredictionModel = {
    appId: 999,
    appName: "Demo Application",
    predictionGenerated: new Date(),
    predictionTimeSlots: [],
    aggregatedFailureProbability: 0.85,
    recommendedActions: [
      "Schedule a restart within the next 2 hours",
      "Check memory usage patterns"
    ],
    highRiskPeriods: [
      {
        startTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        endTime: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
        risk: "high",
        description: "Memory leak likely to cause failure"
      }
    ]
  };
  
  const sendStatusNotification = (newStatus: AppStatus) => {
    const notification = generateStatusChangeNotification(
      demoApp,
      demoApp.status as AppStatus,
      newStatus
    );
    
    if (notification) {
      addNotification(notification);
    }
  };
  
  const sendPredictionNotification = () => {
    const notification = generatePredictionNotification(demoPrediction);
    
    if (notification) {
      addNotification(notification);
    }
  };
  
  const sendRecommendationNotification = (score: number) => {
    const notification = generateRestartRecommendationNotification(
      demoApp.name,
      demoApp.id,
      score,
      score >= 80 
        ? "Memory leak detected that will cause failure" 
        : "Performance degradation observed over time"
    );
    
    if (notification) {
      addNotification(notification);
    }
  };
  
  const sendSystemNotification = (type: "info" | "warning" | "error" | "success") => {
    let title = "";
    let message = "";
    
    switch (type) {
      case "info":
        title = "System Information";
        message = "The monitoring service has been updated to version 2.0";
        break;
      case "warning":
        title = "System Warning";
        message = "The system is experiencing high load. Performance may be affected.";
        break;
      case "error":
        title = "System Error";
        message = "Database connection error. The system may experience data access issues.";
        break;
      case "success":
        title = "System Update Successful";
        message = "All systems updated and running optimally.";
        break;
    }
    
    const notification = generateSystemNotification(title, message, type);
    addNotification(notification);
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Notification System Demo</CardTitle>
        <CardDescription>
          Test the notification system with different types of notifications
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="prediction">Prediction</TabsTrigger>
            <TabsTrigger value="recommendation">Recommendation</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>
          
          <TabsContent value="status" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Generate notifications when an application changes status
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => sendStatusNotification(AppStatus.RUNNING)} size="sm" variant="default">
                App Started
              </Button>
              <Button onClick={() => sendStatusNotification(AppStatus.STOPPED)} size="sm" variant="outline">
                App Stopped
              </Button>
              <Button onClick={() => sendStatusNotification(AppStatus.UNREACHABLE)} size="sm" variant="outline">
                App Unreachable
              </Button>
              <Button onClick={() => sendStatusNotification(AppStatus.ERROR)} size="sm" variant="destructive">
                App Error
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="prediction" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Generate notifications for failure predictions
            </p>
            <Button onClick={sendPredictionNotification} size="sm">
              High Failure Risk Detected
            </Button>
          </TabsContent>
          
          <TabsContent value="recommendation" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Generate notifications for restart recommendations
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => sendRecommendationNotification(60)} size="sm" variant="outline">
                Moderate Risk (60%)
              </Button>
              <Button onClick={() => sendRecommendationNotification(85)} size="sm" variant="destructive">
                High Risk (85%)
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="system" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Generate notifications for system events
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => sendSystemNotification("info")} size="sm" variant="outline">
                Info
              </Button>
              <Button onClick={() => sendSystemNotification("success")} size="sm" variant="default">
                Success
              </Button>
              <Button onClick={() => sendSystemNotification("warning")} size="sm" variant="secondary">
                Warning
              </Button>
              <Button onClick={() => sendSystemNotification("error")} size="sm" variant="destructive">
                Error
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Note: In a real application, these notifications would be generated automatically
        based on actual system events rather than manual triggers.
      </CardFooter>
    </Card>
  );
}
