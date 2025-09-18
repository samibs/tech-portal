import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { AppStatus, LogEntry } from "@shared/schema";
import { getLogs } from "@/lib/api";
import { formatDistanceToNow, format } from "date-fns";
import { Activity, AlertTriangle, CheckCircle, Clock, Info, X } from "lucide-react";

interface TimelineEvent {
  id: number;
  appId: number;
  appName: string;
  timestamp: string;
  action: string;
  details: string;
  status: string;
}

export default function ActivityTimeline() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<TimelineEvent[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
    // Poll for new events every 30 seconds
    const intervalId = setInterval(fetchEvents, 30000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (filter === "all") {
      setFilteredEvents(events);
    } else {
      setFilteredEvents(events.filter(event => {
        if (filter === "status") return event.action === "Status Change";
        if (filter === "control") return ["Started", "Stopped", "Restarted"].includes(event.action);
        if (filter === "error") return event.action.includes("Error") || event.action.includes("Failed");
        return true;
      }));
    }
  }, [events, filter]);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const logs = await getLogs();
      
      // Convert the logs to timeline events with app names
      const timelineEvents = logs.map((log: LogEntry & { appName?: string }) => ({
        id: log.id,
        appId: log.appId,
        appName: log.appName || `App ${log.appId}`, // Use app name if available, otherwise fallback
        timestamp: log.timestamp,
        action: log.action,
        details: log.details || '',
        status: log.status || ''
      }));
      
      // Sort by timestamp (newest first)
      const sortedEvents = timelineEvents.sort((a: TimelineEvent, b: TimelineEvent) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      setEvents(sortedEvents);
    } catch (error) {
      console.error("Error fetching logs:", error);
      toast({
        title: "Error",
        description: "Failed to fetch activity logs",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getActionIcon = (action: string, status: string) => {
    if (action.includes("Error") || action.includes("Failed")) {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
    if (action === "Status Change" && status === AppStatus.RUNNING) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (action === "Status Change" && status === AppStatus.STOPPED) {
      return <X className="h-4 w-4 text-red-500" />;
    }
    if (action === "Status Change") {
      return <Info className="h-4 w-4 text-yellow-500" />;
    }
    if (action.includes("Restart")) {
      return <Activity className="h-4 w-4 text-blue-500" />;
    }
    return <Clock className="h-4 w-4 text-gray-500" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case AppStatus.RUNNING:
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case AppStatus.STOPPED:
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case AppStatus.UNREACHABLE:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case AppStatus.ERROR:
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="mr-2 h-5 w-5" />
            Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start space-x-4 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-1"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center">
            <Activity className="mr-2 h-5 w-5" />
            Activity Timeline
          </CardTitle>
          <Tabs defaultValue="all" onValueChange={setFilter} value={filter}>
            <TabsList className="grid grid-cols-4 h-8">
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="status" className="text-xs">Status</TabsTrigger>
              <TabsTrigger value="control" className="text-xs">Control</TabsTrigger>
              <TabsTrigger value="error" className="text-xs">Errors</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="relative ml-3">
          {/* Timeline line */}
          <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700"></div>

          {filteredEvents.length === 0 ? (
            <div className="flex justify-center items-center py-8 text-gray-500 dark:text-gray-400">
              No activity logs found
            </div>
          ) : (
            <div className="space-y-6 relative">
              {filteredEvents.slice(0, 15).map((event) => (
                <div key={event.id} className="ml-8 relative">
                  {/* Timeline dot */}
                  <div className="absolute -left-10 mt-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                    {getActionIcon(event.action, event.status)}
                  </div>
                  
                  <div className="flex flex-col space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium">{event.appName}</h4>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                      </span>
                      <Badge variant="outline" className={getStatusColor(event.status)}>
                        {event.status}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      <span className="font-medium">{event.action}:</span> {event.details}
                    </p>
                    
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {format(new Date(event.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                    </p>
                  </div>
                </div>
              ))}
              
              {filteredEvents.length > 15 && (
                <div className="flex justify-center py-2">
                  <Badge variant="outline" className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                    View {filteredEvents.length - 15} more events
                  </Badge>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}