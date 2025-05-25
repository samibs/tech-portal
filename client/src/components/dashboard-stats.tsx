import { 
  Layers, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock 
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface Stats {
  totalApps: number;
  runningApps: number;
  stoppedApps: number;
  unreachableApps: number;
  checkFrequency: number;
}

interface DashboardStatsProps {
  stats?: Stats;
  onChangeFrequency: () => void;
  isLoading: boolean;
}

export default function DashboardStats({ 
  stats, 
  onChangeFrequency, 
  isLoading 
}: DashboardStatsProps) {
  // Format check frequency for display
  const formatFrequency = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}s`;
    } else {
      return `${Math.floor(seconds / 60)}m`;
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4">
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">System Overview</h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Apps Card */}
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-primary-100 dark:bg-primary-900 rounded-md p-3">
                  <Layers className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Total Applications
                    </dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900 dark:text-white">
                        {stats?.totalApps || 0}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Running Apps Card */}
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-100 dark:bg-green-900 rounded-md p-3">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Running Applications
                    </dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900 dark:text-white">
                        {stats?.runningApps || 0}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stopped Apps Card */}
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-red-100 dark:bg-red-900 rounded-md p-3">
                  <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Stopped Applications
                    </dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900 dark:text-white">
                        {stats?.stoppedApps || 0}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Check Frequency Card */}
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-yellow-100 dark:bg-yellow-900 rounded-md p-3">
                  <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Check Frequency
                    </dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900 dark:text-white">
                        {formatFrequency(stats?.checkFrequency || 30)}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            )}
          </CardContent>
          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3">
            <Button 
              variant="link" 
              className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500 p-0" 
              onClick={onChangeFrequency}
            >
              Change
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
