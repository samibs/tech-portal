import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; 
import { getAppLogs, getApp } from "@/lib/api";
import { ArrowLeftIcon, RefreshCwIcon, AlertTriangleIcon } from "lucide-react";
import { format } from "date-fns";

export default function AppLogsPage() {
  const { appId } = useParams();
  const id = appId ? parseInt(appId) : undefined;

  const { data: logs, isLoading: logsLoading, isError: logsError } = useQuery({
    queryKey: [`/api/apps/${id}/logs`],
    queryFn: () => getAppLogs(id as number),
    enabled: !!id,
  });

  const { data: app, isLoading: appLoading, isError: appError } = useQuery({
    queryKey: [`/api/apps/${id}`],
    queryFn: () => getApp(id as number),
    enabled: !!id,
  });

  const isLoading = logsLoading || appLoading;
  const isError = logsError || appError;

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            className="mr-4" 
            asChild
          >
            <Link to="/">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <Skeleton className="h-8 w-64" />
        </div>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array(5).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || !logs || !app) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              className="mr-4" 
              asChild
            >
              <Link to="/">
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Application Logs</h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCwIcon className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
        
        <Alert variant="destructive">
          <AlertTriangleIcon className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Unable to load application logs. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            className="mr-4" 
            asChild
          >
            <Link to="/">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Logs: {app.name}</h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          <RefreshCwIcon className="mr-2 h-4 w-4" />
          Refresh Logs
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Activity Logs</CardTitle>
          <CardDescription>
            Recent activity and events for this application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {logs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No log entries found for this application.</p>
            </div>
          ) : (
            <div className="space-y-4 divide-y divide-gray-200 dark:divide-gray-700">
              {logs.map((log: any) => (
                <div key={log.id} className="pt-4 first:pt-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{log.action}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{log.details}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(log.timestamp), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}