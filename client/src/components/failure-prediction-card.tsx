import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { getAppPrediction, AppPredictionModel } from "@/lib/api";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeftIcon } from "lucide-react";

interface FailurePredictionCardProps {
  appId: number;
}

export default function FailurePredictionCard({ appId }: FailurePredictionCardProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  
  const { data: prediction, isLoading, isError } = useQuery({
    queryKey: ['/api/apps', appId, 'prediction'],
    queryFn: () => getAppPrediction(appId),
    refetchInterval: 1000 * 60 * 5, // Refresh every 5 minutes
    enabled: !!appId,
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

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical': return 'bg-red-500 hover:bg-red-600';
      case 'high': return 'bg-orange-500 hover:bg-orange-600';
      case 'medium': return 'bg-yellow-500 hover:bg-yellow-600';
      case 'low': return 'bg-green-500 hover:bg-green-600';
      default: return 'bg-slate-500 hover:bg-slate-600';
    }
  };

  const getFailureProbabilityColor = (probability: number) => {
    if (probability >= 0.7) return 'text-red-600';
    if (probability >= 0.4) return 'text-orange-600';
    if (probability >= 0.2) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getMetricsData = () => {
    if (!prediction || !prediction.predictionTimeSlots) return [];
    
    return prediction.predictionTimeSlots.map(slot => ({
      time: formatDateTime(slot.startTime),
      failureProbability: Math.round(slot.failureProbability * 100),
      errorRate: slot.predictedMetrics?.errorRate || 0,
      availability: slot.predictedMetrics?.availabilityPercent || 100,
      utilization: slot.predictedMetrics?.resourceUtilization || 0,
    }));
  };

  // Back button component to ensure consistent design
  const BackButton = () => (
    <div className="flex items-center mb-2">
      <Button 
        variant="ghost" 
        size="sm" 
        className="mr-2 -ml-2" 
        asChild
      >
        <Link to="/predictions">
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Predictions
        </Link>
      </Button>
    </div>
  );

  if (isLoading) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <BackButton />
          <CardTitle>
            <Skeleton className="h-8 w-64" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-52" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !prediction) {
    return (
      <Card className="shadow-md border-red-300">
        <CardHeader>
          <BackButton />
          <CardTitle>Failure Prediction Unavailable</CardTitle>
          <CardDescription>
            Unable to generate prediction data for this application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            The prediction system requires more data to generate accurate predictions.
            Continue monitoring this application to build a prediction model.
          </p>
        </CardContent>
      </Card>
    );
  }

  const hasPrediction = prediction.predictionTimeSlots && prediction.predictionTimeSlots.length > 0;
  const failureProbability = Math.round(prediction.aggregatedFailureProbability * 100);
  const metricsData = getMetricsData();

  return (
    <Card className="shadow-md">
      <CardHeader>
        <BackButton />
        <CardTitle className="flex justify-between items-center">
          <span>Failure Prediction for {prediction.appName}</span>
          {hasPrediction && (
            <span className={`text-xl font-bold ${getFailureProbabilityColor(prediction.aggregatedFailureProbability)}`}>
              {failureProbability}% Risk
            </span>
          )}
        </CardTitle>
        <CardDescription>
          {hasPrediction ? (
            <span>
              Generated {formatDateTime(prediction.predictionGenerated)}, predicting next 24 hours
            </span>
          ) : (
            <span>No prediction data available yet</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasPrediction ? (
          <p className="text-sm text-muted-foreground">
            The prediction system requires more historical data to generate accurate predictions.
            Continue monitoring this application to build a prediction model.
          </p>
        ) : (
          <>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Failure Probability</span>
                <span className={getFailureProbabilityColor(prediction.aggregatedFailureProbability)}>
                  {failureProbability}%
                </span>
              </div>
              <Progress value={failureProbability} className="h-2" />
            </div>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="chart" className="border-b">
                <AccordionTrigger>
                  Failure Probability Timeline
                </AccordionTrigger>
                <AccordionContent>
                  <div className="h-64 w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={metricsData}
                        margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                      >
                        <defs>
                          <linearGradient id="colorProb" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#f97316" stopOpacity={0.1} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                        <XAxis 
                          dataKey="time" 
                          tick={{ fontSize: 10 }} 
                          tickFormatter={(value) => value.split(',')[0]}
                        />
                        <YAxis 
                          tick={{ fontSize: 10 }} 
                          domain={[0, 100]} 
                          tickFormatter={(value) => `${value}%`}
                        />
                        <Tooltip formatter={(value: number) => [`${value}%`, 'Failure Risk']} />
                        <Area 
                          type="monotone" 
                          dataKey="failureProbability" 
                          stroke="#f97316" 
                          fillOpacity={1} 
                          fill="url(#colorProb)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="risk-periods" className="border-b">
                <AccordionTrigger>
                  High Risk Periods
                </AccordionTrigger>
                <AccordionContent>
                  {prediction.highRiskPeriods.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">
                      No high-risk periods detected in the prediction window.
                    </p>
                  ) : (
                    <div className="space-y-3 py-2">
                      {prediction.highRiskPeriods.map((period, index) => (
                        <div key={index} className="border rounded-md p-3 bg-background/50">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={getRiskColor(period.risk)}>
                              {period.risk.charAt(0).toUpperCase() + period.risk.slice(1)} Risk
                            </Badge>
                            <span className="text-sm font-medium">
                              {formatDateTime(period.startTime)} - {formatDateTime(period.endTime)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{period.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="recommendations" className="border-b">
                <AccordionTrigger>
                  Recommended Actions
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 list-disc list-inside py-2">
                    {prediction.recommendedActions.map((action, index) => (
                      <li key={index} className="text-sm">{action}</li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="details" className="border-b">
                <AccordionTrigger>
                  Contributing Factors
                </AccordionTrigger>
                <AccordionContent>
                  <div className="max-h-40 overflow-y-auto">
                    <ul className="space-y-2 list-disc list-inside py-2">
                      {prediction.predictionTimeSlots
                        .filter(slot => slot.failureProbability > 0.5)
                        .flatMap(slot => slot.contributingFactors)
                        .filter((factor, index, self) => self.indexOf(factor) === index) // Remove duplicates
                        .map((factor, index) => (
                          <li key={index} className="text-sm">{factor}</li>
                        ))}
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </>
        )}
      </CardContent>
    </Card>
  );
}