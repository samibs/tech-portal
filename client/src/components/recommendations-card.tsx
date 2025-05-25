import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RestartRecommendation, getRestartRecommendations, restartApp } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";
import { 
  AlertTriangle, 
  RotateCw, 
  Clock, 
  AlertCircle, 
  ArrowUpCircle,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  LineChart,
  Lightbulb,
  BrainCircuit,
  Sparkles
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface RecommendationsCardProps {
  onAppRestarted: () => void;
}

export default function RecommendationsCard({ onAppRestarted }: RecommendationsCardProps) {
  const { toast } = useToast();
  const [recommendations, setRecommendations] = useState<RestartRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [restartingAppId, setRestartingAppId] = useState<number | null>(null);
  const [expandedRecommendations, setExpandedRecommendations] = useState<number[]>([]);

  useEffect(() => {
    fetchRecommendations();
    
    // Refresh recommendations every 60 seconds
    const interval = setInterval(() => {
      fetchRecommendations();
    }, 60000);
    
    return () => clearInterval(interval);
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

  const toggleExpandRecommendation = (id: number) => {
    setExpandedRecommendations(prev => 
      prev.includes(id) 
        ? prev.filter(appId => appId !== id)
        : [...prev, id]
    );
  };

  const getUrgencyBadge = (urgency?: string) => {
    if (!urgency) return null;
    
    switch (urgency) {
      case 'critical':
        return <Badge variant="destructive" className="ml-2">Critical</Badge>;
      case 'high':
        return <Badge variant="destructive" className="ml-2 bg-orange-500">High</Badge>;
      case 'medium':
        return <Badge variant="outline" className="ml-2 border-amber-500 text-amber-500">Medium</Badge>;
      case 'low':
        return <Badge variant="outline" className="ml-2 border-green-500 text-green-500">Low</Badge>;
      default:
        return null;
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
        <CardFooter>
          <Link href="/predictions" className="w-full">
            <Button variant="outline" size="sm" className="w-full">
              <LineChart className="mr-2 h-4 w-4" />
              View Advanced Predictions
            </Button>
          </Link>
        </CardFooter>
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
          Intelligent recommendations based on advanced app performance analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendations.slice(0, 3).map((recommendation) => (
          <Collapsible 
            key={recommendation.appId} 
            open={expandedRecommendations.includes(recommendation.appId)}
            onOpenChange={() => toggleExpandRecommendation(recommendation.appId)}
            className="border rounded-lg p-4 transition-all hover:shadow-md"
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium flex items-center">
                {recommendation.appName}
                {getUrgencyBadge(recommendation.urgency)}
              </h3>
              <span className={`text-sm font-semibold ${getRecommendationClass(recommendation.recommendationScore)}`}>
                Score: {recommendation.recommendationScore}/100
              </span>
            </div>
            
            <Progress 
              value={recommendation.recommendationScore} 
              className={`h-2 mb-2 ${getProgressColor(recommendation.recommendationScore)}`}
            />
            
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{recommendation.reason}</p>
            
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-3 grid grid-cols-2 gap-1">
              <div className="flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {recommendation.lastRestarted ? (
                  <span>Last restarted: {formatDistanceToNow(new Date(recommendation.lastRestarted), { addSuffix: true })}</span>
                ) : (
                  <span>No recent restarts</span>
                )}
              </div>
              <div className="flex items-center">
                <ArrowUpCircle className="h-3 w-3 mr-1" />
                <span>Uptime: {Math.round(recommendation.uptime / 60)} hours</span>
              </div>
            </div>
            
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="p-0 h-6 mb-2 w-full flex justify-center items-center">
                {expandedRecommendations.includes(recommendation.appId) ? (
                  <span className="flex items-center text-xs text-gray-500">
                    Show less <ChevronUp className="h-4 w-4 ml-1" />
                  </span>
                ) : (
                  <span className="flex items-center text-xs text-gray-500">
                    Show advanced analysis <ChevronDown className="h-4 w-4 ml-1" />
                  </span>
                )}
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="pt-2 border-t mt-1 mb-3">
              <div className="space-y-3">
                {recommendation.memoryLeakLikelihood && recommendation.memoryLeakLikelihood > 20 && (
                  <div className="flex items-start text-xs">
                    <AlertCircle className="h-4 w-4 mr-2 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Memory Leak Probability: {recommendation.memoryLeakLikelihood}%</p>
                      <p className="text-gray-500 dark:text-gray-400">
                        Analysis indicates potential memory resource exhaustion if the application continues to run.
                      </p>
                    </div>
                  </div>
                )}
                
                {recommendation.primaryFactor && (
                  <div className="flex items-start text-xs">
                    <TrendingUp className="h-4 w-4 mr-2 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Primary Factor: {recommendation.primaryFactor}</p>
                      <p className="text-gray-500 dark:text-gray-400">
                        This is the main contributing factor to the restart recommendation.
                      </p>
                    </div>
                  </div>
                )}
                
                {recommendation.recommendedTimeWindow && (
                  <div className="flex items-start text-xs">
                    <Clock className="h-4 w-4 mr-2 text-purple-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Recommended Timing: {recommendation.recommendedTimeWindow}</p>
                    </div>
                  </div>
                )}
                
                {recommendation.predictedIssues && recommendation.predictedIssues.length > 0 && (
                  <div className="flex items-start text-xs">
                    <AlertTriangle className="h-4 w-4 mr-2 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Predicted Issues:</p>
                      <ul className="list-disc list-inside pl-1 text-gray-500 dark:text-gray-400 space-y-1">
                        {recommendation.predictedIssues.map((issue, idx) => (
                          <li key={idx}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                
                {recommendation.statusHistory && recommendation.statusHistory.length > 0 && (
                  <div className="flex items-start text-xs">
                    <RotateCw className="h-4 w-4 mr-2 text-gray-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Recent Status History:</p>
                      <ul className="list-none pl-1 text-gray-500 dark:text-gray-400 space-y-1">
                        {recommendation.statusHistory.map((status, idx) => (
                          <li key={idx}>{status}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                
                {recommendation.insights && recommendation.insights.length > 0 && (
                  <div className="flex items-start text-xs mt-3 pt-3 border-t border-dashed border-gray-200 dark:border-gray-700">
                    <BrainCircuit className="h-4 w-4 mr-2 text-purple-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium flex items-center">
                        Advanced Analysis
                        {recommendation.confidenceScore && (
                          <span className="ml-2 text-xs px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900 rounded text-purple-800 dark:text-purple-300">
                            {recommendation.confidenceScore}% confidence
                          </span>
                        )}
                      </p>
                      <ul className="mt-1.5 space-y-2">
                        {recommendation.insights.map((insight, idx) => (
                          <li key={idx} className="flex items-start text-gray-600 dark:text-gray-300">
                            <Lightbulb className="h-3.5 w-3.5 mr-2 text-amber-500 shrink-0 mt-0.5" />
                            <span>{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                
                {recommendation.alternativeSolutions && recommendation.alternativeSolutions.length > 0 && (
                  <div className="flex items-start text-xs mt-2">
                    <Sparkles className="h-4 w-4 mr-2 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Alternative Solutions:</p>
                      <ul className="list-disc list-inside pl-1 text-gray-500 dark:text-gray-400 space-y-1">
                        {recommendation.alternativeSolutions.map((solution, idx) => (
                          <li key={idx}>{solution}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleContent>
            
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
          </Collapsible>
        ))}
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        {recommendations.length > 3 && (
          <Button variant="ghost" size="sm" className="w-full">
            View All Recommendations ({recommendations.length})
          </Button>
        )}
        <Link href="/predictions" className="w-full">
          <Button variant="outline" size="sm" className="w-full">
            <LineChart className="mr-2 h-4 w-4" />
            View Advanced Predictions
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}