import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RestartRecommendation, getRestartRecommendations, restartApp } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, RotateCw } from "lucide-react";

interface RecommendationsCardProps {
  onAppRestarted: () => void;
}

export default function RecommendationsCard({ onAppRestarted }: RecommendationsCardProps) {
  const { toast } = useToast();
  const [recommendations, setRecommendations] = useState<RestartRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [restartingAppId, setRestartingAppId] = useState<number | null>(null);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const data = await getRestartRecommendations();
      setRecommendations(data);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      toast({
        title: "Error",
        description: "Failed to fetch restart recommendations.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestartApp = async (recommendation: RestartRecommendation) => {
    try {
      setRestartingAppId(recommendation.appId);
      const response = await restartApp(recommendation.appId);
      toast({
        title: "Application Restart Simulated",
        description: response.simulation 
          ? `${recommendation.appName} has been simulated to restart based on recommendation. (Simulation)`
          : `${recommendation.appName} has been restarted based on recommendation.`,
      });
      onAppRestarted();
      // Refresh recommendations
      fetchRecommendations();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to restart ${recommendation.appName}: ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setRestartingAppId(null);
    }
  };

  const getRecommendationClass = (score: number) => {
    if (score >= 70) return "text-red-600 dark:text-red-500";
    if (score >= 40) return "text-amber-600 dark:text-amber-500";
    return "text-green-600 dark:text-green-500";
  };

  const getProgressColor = (score: number) => {
    if (score >= 70) return "[&>div]:bg-red-600";
    if (score >= 40) return "[&>div]:bg-amber-600";
    return "[&>div]:bg-green-600";
  };

  if (loading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Restart Recommendations</CardTitle>
          <CardDescription>Loading restart recommendations...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Restart Recommendations</CardTitle>
          <CardDescription>No restart recommendations at this time</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            All applications appear to be running optimally. The system will continue to monitor for any changes in performance.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Restart Recommendations
        </CardTitle>
        <CardDescription>
          Intelligent recommendations based on app performance metrics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendations.slice(0, 3).map((recommendation) => (
          <div key={recommendation.appId} className="border rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium">{recommendation.appName}</h3>
              <span className={`text-sm font-semibold ${getRecommendationClass(recommendation.recommendationScore)}`}>
                Score: {recommendation.recommendationScore}/100
              </span>
            </div>
            
            <Progress 
              value={recommendation.recommendationScore} 
              className={`h-2 mb-2 ${getProgressColor(recommendation.recommendationScore)}`}
            />
            
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{recommendation.reason}</p>
            
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              {recommendation.lastRestarted ? (
                <p>Last restarted: {formatDistanceToNow(new Date(recommendation.lastRestarted), { addSuffix: true })}</p>
              ) : (
                <p>No recent restarts</p>
              )}
              <p>Uptime: {Math.round(recommendation.uptime / 60)} hours</p>
            </div>
            
            <Button 
              onClick={() => handleRestartApp(recommendation)} 
              size="sm" 
              className="w-full"
              disabled={restartingAppId === recommendation.appId}
            >
              {restartingAppId === recommendation.appId ? (
                <span className="flex items-center">
                  <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                  Restarting...
                </span>
              ) : (
                <span className="flex items-center">
                  <RotateCw className="mr-2 h-4 w-4" />
                  Restart Now
                </span>
              )}
            </Button>
          </div>
        ))}
      </CardContent>
      {recommendations.length > 3 && (
        <CardFooter>
          <Button variant="ghost" size="sm" className="w-full">
            View All Recommendations ({recommendations.length})
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}