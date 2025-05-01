import { useState, useEffect } from "react";
import { ReplitApp } from "@shared/schema";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  Play, Square, RotateCw, FileText, 
  MoreVertical, Pencil, ExternalLink, Trash2,
  TrendingUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { startApp, stopApp, restartApp } from "@/lib/api";
import EditAppDialog from "@/components/edit-app-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AppCardProps {
  app: ReplitApp;
  onStatusChange: () => void;
}

export default function AppCard({ app, onStatusChange }: AppCardProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(app.status);
  const [isAnimating, setIsAnimating] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  // For smooth status transition animation
  useEffect(() => {
    if (status !== app.status) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setStatus(app.status);
        setIsAnimating(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [app.status, status]);

  const handleStart = async () => {
    setIsLoading(true);
    try {
      const response = await startApp(app.id);
      toast({
        title: "Application Start Simulated",
        description: response.simulation 
          ? `${app.name} status set to running. (Simulation)`
          : `${app.name} is now running.`,
      });
      onStatusChange();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to start ${app.name}: ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    setIsLoading(true);
    try {
      const response = await stopApp(app.id);
      toast({
        title: "Application Stop Simulated",
        description: response.simulation 
          ? `${app.name} status set to stopped. (Simulation)`
          : `${app.name} has been stopped.`,
        variant: "default",
      });
      onStatusChange();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to stop ${app.name}: ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestart = async () => {
    setIsLoading(true);
    try {
      const response = await restartApp(app.id);
      toast({
        title: "Application Restart Simulated",
        description: response.simulation 
          ? `${app.name} has been simulated to restart. (Simulation)`
          : `${app.name} has been restarted.`,
      });
      onStatusChange();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to restart ${app.name}: ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isRunning = app.status === "Running";
  const lastCheckedText = app.lastChecked 
    ? formatDistanceToNow(new Date(app.lastChecked), { addSuffix: true })
    : "never";

  return (
    <>
      <Card className={`overflow-hidden transition-all duration-300 ${isAnimating ? 'scale-[0.98] opacity-80' : 'scale-100 opacity-100'}`}>
        <CardHeader className="flex justify-between items-center py-5 px-6 border-b relative">
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">{app.name}</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">{app.type}</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`transition-all duration-300 ${isAnimating ? 'scale-110 rotate-3' : ''}`}>
              <StatusBadge status={app.status} />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.open(app.replitUrl, '_blank')}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open URL
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-red-600 focus:text-red-600" 
                  onClick={() => {
                    toast({
                      title: "Delete Functionality",
                      description: "App deletion feature will be implemented soon.",
                    });
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:p-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Replit URL</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 truncate">{app.replitUrl}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Port</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{app.port}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Start Command</dt>
              <dd className="mt-1 text-sm font-mono text-gray-900 dark:text-gray-100 truncate">{app.startCommand}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Checked</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{lastCheckedText}</dd>
            </div>
          </dl>
        </CardContent>
        <CardFooter className="bg-gray-50 dark:bg-gray-800 px-4 py-4 sm:px-6 flex flex-col gap-3">
          <div className="flex justify-between gap-2">
            <div className="flex-1">
              {isRunning ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRestart}
                  disabled={isLoading}
                  className="w-full transition-all hover:shadow-md"
                >
                  <RotateCw className={`-ml-0.5 mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Restart
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.location.href = `/logs/${app.id}`;
                  }}
                  disabled={isLoading}
                  className="w-full transition-all hover:shadow-md"
                >
                  <FileText className="-ml-0.5 mr-2 h-4 w-4" />
                  View Logs
                </Button>
              )}
            </div>
            
            <div className="flex-1">
              {isRunning ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleStop}
                  disabled={isLoading}
                  className="w-full transition-all hover:shadow-md"
                >
                  <Square className="-ml-0.5 mr-2 h-4 w-4" />
                  Stop
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleStart}
                  disabled={isLoading}
                  className="w-full transition-all hover:shadow-md"
                >
                  <Play className="-ml-0.5 mr-2 h-4 w-4" />
                  Start
                </Button>
              )}
            </div>
          </div>
          
          <Button 
            variant="secondary" 
            size="sm" 
            className="w-full transition-all hover:shadow-md"
            asChild
          >
            <Link to={`/predictions/${app.id}`}>
              <TrendingUp className="-ml-0.5 mr-2 h-4 w-4" />
              View Predictions
            </Link>
          </Button>
        </CardFooter>
      </Card>

      <EditAppDialog 
        app={app}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onAppUpdated={onStatusChange}
      />
    </>
  );
}
