import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getApps, getStats } from "@/lib/api";

export function useApps() {
  const queryClient = useQueryClient();
  
  // Fetch apps
  const { 
    data: apps, 
    isLoading: isAppsLoading,
    isError: isAppsError,
    refetch: refetchApps
  } = useQuery({
    queryKey: ["/api/apps"],
    queryFn: () => getApps(),
  });
  
  // Fetch stats
  const { 
    data: stats, 
    isLoading: isStatsLoading,
    isError: isStatsError,
    refetch: refetchStats
  } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: () => getStats(),
  });
  
  // Combined loading state
  const isLoading = isAppsLoading || isStatsLoading;
  
  // Combined error state
  const isError = isAppsError || isStatsError;
  
  return {
    apps,
    stats,
    isLoading,
    isError,
    refetchApps,
    refetchStats,
    invalidateCache: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/apps"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    }
  };
}
