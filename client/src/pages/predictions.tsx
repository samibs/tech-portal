import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; 
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FailurePredictionCard from "@/components/failure-prediction-card";
import { getAllPredictions, getAppPrediction, AppPredictionModel } from "@/lib/api";
import { ArrowRightIcon, AlertCircleIcon, TrendingUpIcon, ClockIcon, AlertTriangleIcon, RefreshCwIcon, ArrowLeftIcon } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function PredictionsPage() {
  const { appId } = useParams();
  const selectedAppId = appId ? parseInt(appId) : undefined;

  const { data: predictions, isLoading, isError } = useQuery({
    queryKey: ['/api/predictions'],
    queryFn: getAllPredictions,
    refetchInterval: 1000 * 60 * 5, // Refresh every 5 minutes
  });

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  const getFailureProbabilityColor = (probability: number) => {
    if (probability >= 0.7) return 'text-red-600 dark:text-red-400';
    if (probability >= 0.4) return 'text-orange-600 dark:text-orange-400';
    if (probability >= 0.2) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getRiskBadgeColor = (probability: number) => {
    if (probability >= 0.7) return 'bg-red-500 hover:bg-red-600';
    if (probability >= 0.4) return 'bg-orange-500 hover:bg-orange-600';
    if (probability >= 0.2) return 'bg-yellow-500 hover:bg-yellow-600';
    return 'bg-green-500 hover:bg-green-600';
  };

  const getHighestRiskApp = () => {
    if (!predictions || predictions.length === 0) return null;
    
    return predictions.reduce((highest, current) => 
      current.aggregatedFailureProbability > highest.aggregatedFailureProbability ? current : highest
    );
  };

  const getMostImminentRisk = () => {
    if (!predictions || predictions.length === 0) return null;
    
    // Flatten all high-risk periods, sort by start time, and get the earliest
    const allPeriods = predictions
      .flatMap(prediction => 
        prediction.highRiskPeriods.map(period => ({
          appId: prediction.appId,
          appName: prediction.appName,
          ...period
        }))
      )
      .filter(period => ['high', 'critical'].includes(period.risk))
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    
    return allPeriods.length > 0 ? allPeriods[0] : null;
  };

  const highestRiskApp = getHighestRiskApp();
  const mostImminentRisk = getMostImminentRisk();

  if (isError) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Application Predictions</h1>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCwIcon className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
        
        <Alert variant="destructive">
          <AlertTriangleIcon className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Unable to load prediction data. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  const [, setLocation] = useLocation();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            className="mr-4" 
            onClick={() => setLocation('/')}
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Application Predictions</h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          <RefreshCwIcon className="mr-2 h-4 w-4" />
          Refresh Predictions
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {highestRiskApp && (
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Highest Risk Application</CardTitle>
              <CardDescription>The application with the highest failure prediction score</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-lg">{highestRiskApp.appName}</span>
                  <Badge className={getRiskBadgeColor(highestRiskApp.aggregatedFailureProbability)}>
                    {Math.round(highestRiskApp.aggregatedFailureProbability * 100)}% Risk
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span>Failure Probability</span>
                    <span className={getFailureProbabilityColor(highestRiskApp.aggregatedFailureProbability)}>
                      {Math.round(highestRiskApp.aggregatedFailureProbability * 100)}%
                    </span>
                  </div>
                  <Progress 
                    value={Math.round(highestRiskApp.aggregatedFailureProbability * 100)} 
                    className="h-2" 
                  />
                </div>
                
                {highestRiskApp.recommendedActions.length > 0 && (
                  <div className="text-sm">
                    <p className="font-medium mb-1">Top Recommendation:</p>
                    <p className="text-muted-foreground">{highestRiskApp.recommendedActions[0]}</p>
                  </div>
                )}
                
                <Button size="sm" asChild>
                  <Link to={`/predictions/${highestRiskApp.appId}`}>
                    View Prediction Details <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {mostImminentRisk && (
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Most Imminent Risk</CardTitle>
              <CardDescription>The upcoming high risk period that requires attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-lg">{mostImminentRisk.appName}</span>
                  <Badge className={`bg-${mostImminentRisk.risk === 'critical' ? 'red' : 'orange'}-500 hover:bg-${mostImminentRisk.risk === 'critical' ? 'red' : 'orange'}-600`}>
                    {mostImminentRisk.risk.charAt(0).toUpperCase() + mostImminentRisk.risk.slice(1)} Risk
                  </Badge>
                </div>
                
                <div className="flex items-center text-sm text-muted-foreground">
                  <ClockIcon className="mr-2 h-4 w-4" />
                  <span>{formatDateTime(mostImminentRisk.startTime)} - {formatDateTime(mostImminentRisk.endTime)}</span>
                </div>
                
                <p className="text-sm">{mostImminentRisk.description}</p>
                
                <Button size="sm" asChild>
                  <Link to={`/predictions/${mostImminentRisk.appId}`}>
                    View Full Prediction <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      <Tabs defaultValue={selectedAppId ? selectedAppId.toString() : "all"} className="w-full">
        <TabsList className="w-full max-w-lg mb-4 h-auto flex-wrap">
          <TabsTrigger value="all" className="flex-grow">All Applications</TabsTrigger>
          {predictions && predictions.map(prediction => (
            <TabsTrigger 
              key={prediction.appId} 
              value={prediction.appId.toString()}
              className="flex-grow"
            >
              {prediction.appName}
            </TabsTrigger>
          ))}
        </TabsList>
        
        <TabsContent value="all" className="mt-0">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <Card key={i} className="shadow-md">
                  <CardHeader>
                    <Skeleton className="h-8 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-40 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : isError || !predictions || predictions.length === 0 ? (
            <Card className="shadow-md border-yellow-300">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertCircleIcon className="mr-2 h-5 w-5 text-yellow-500" />
                  No Prediction Data Available
                </CardTitle>
                <CardDescription>
                  The prediction system needs more data to generate accurate predictions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Continue monitoring your applications to build up enough historical data for the
                  predictive analytics system. This typically requires several days of operation
                  with various status changes and events.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {predictions.map(prediction => (
                <PredictionSummaryCard 
                  key={prediction.appId} 
                  prediction={prediction} 
                />
              ))}
            </div>
          )}
        </TabsContent>
        
        {predictions && predictions.map(prediction => (
          <TabsContent key={prediction.appId} value={prediction.appId.toString()} className="mt-0">
            <FailurePredictionCard appId={prediction.appId} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

interface PredictionSummaryCardProps {
  prediction: AppPredictionModel;
}

function PredictionSummaryCard({ prediction }: PredictionSummaryCardProps) {
  const [, setLocation] = useLocation();
  const failureProbability = Math.round(prediction.aggregatedFailureProbability * 100);
  
  const getFailureProbabilityColor = (probability: number) => {
    if (probability >= 0.7) return 'text-red-600 dark:text-red-400';
    if (probability >= 0.4) return 'text-orange-600 dark:text-orange-400';
    if (probability >= 0.2) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };
  
  const handleViewDetails = () => {
    setLocation(`/predictions/${prediction.appId}`);
  };
  
  return (
    <Card className="shadow-md overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl">{prediction.appName}</CardTitle>
          <span className={`text-xl font-bold ${getFailureProbabilityColor(prediction.aggregatedFailureProbability)}`}>
            {failureProbability}%
          </span>
        </div>
        <CardDescription>
          Prediction for next 24 hours
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span>Failure Probability</span>
              <span className={getFailureProbabilityColor(prediction.aggregatedFailureProbability)}>
                {failureProbability}%
              </span>
            </div>
            <Progress value={failureProbability} className="h-2" />
          </div>
          
          {prediction.highRiskPeriods.length > 0 && (
            <div className="flex items-center text-sm text-muted-foreground">
              <AlertCircleIcon className="h-4 w-4 mr-2 text-orange-500" />
              <span>
                {prediction.highRiskPeriods.length} high-risk period{prediction.highRiskPeriods.length !== 1 ? 's' : ''} detected
              </span>
            </div>
          )}
          
          {prediction.recommendedActions.length > 0 && (
            <div className="flex items-center text-sm text-muted-foreground">
              <TrendingUpIcon className="h-4 w-4 mr-2 text-blue-500" />
              <span>{prediction.recommendedActions.length} action{prediction.recommendedActions.length !== 1 ? 's' : ''} recommended</span>
            </div>
          )}
          
          <Button 
            size="sm" 
            variant="secondary" 
            className="w-full mt-2"
            onClick={handleViewDetails}
          >
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}