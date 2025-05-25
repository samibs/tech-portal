import { useState } from 'react';
import { useApps } from '@/hooks/use-apps';
import Sidebar from '@/components/layout/sidebar';
import MobileHeader from '@/components/layout/mobile-header';
import DashboardStats from '@/components/dashboard-stats';
import AppCard from '@/components/app-card';
import AddAppDialog from '@/components/add-app-dialog';
import ChangeFrequencyDialog from '@/components/change-frequency-dialog';
import RecommendationsCard from '@/components/recommendations-card';
import ActivityTimeline from '@/components/activity-timeline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppType, ReplitApp } from '@shared/schema';
import { Plus, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Dashboard() {
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [addAppDialogOpen, setAddAppDialogOpen] = useState(false);
  const [changeFrequencyDialogOpen, setChangeFrequencyDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  
  const { 
    apps, 
    isLoading, 
    stats, 
    refetchApps, 
    refetchStats 
  } = useApps();

  const filteredApps = apps?.filter((app: ReplitApp) => {
    const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || app.type === filterType;
    return matchesSearch && matchesType;
  }) || [];

  const handleAppAdded = () => {
    toast({
      title: "Success!",
      description: "Application registered successfully.",
    });
    refetchApps();
    refetchStats();
  };

  const handleFrequencyChanged = () => {
    toast({
      title: "Success!",
      description: "Check frequency updated successfully.",
    });
    refetchStats();
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar for desktop */}
      <Sidebar mobileMenuOpen={mobileMenuOpen} closeMobileMenu={() => setMobileMenuOpen(false)} />
      
      {/* Main content area */}
      <div className="flex flex-col flex-1 w-0 overflow-hidden">
        {/* Mobile top navigation */}
        <MobileHeader onMenuClick={() => setMobileMenuOpen(true)} />
        
        {/* Main content header */}
        <div className="bg-white shadow dark:bg-gray-800">
          <div className="px-4 sm:px-6 lg:px-8 py-4 md:py-6 flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Tech Portal Dashboard</h1>
            <div className="flex items-center space-x-4">
              <div className="hidden md:block">
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>
              <Button onClick={() => setAddAppDialogOpen(true)}>
                <Plus className="-ml-1 mr-2 h-5 w-5" />
                Add App
              </Button>
            </div>
          </div>
        </div>
        
        {/* Dashboard content */}
        <div className="flex-1 overflow-auto">
          {/* Dashboard stats */}
          <DashboardStats 
            stats={stats} 
            onChangeFrequency={() => setChangeFrequencyDialogOpen(true)} 
            isLoading={isLoading} 
          />

          <div className="px-4 sm:px-6 lg:px-8 pt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recommendations - takes up 1/3 of the width on large screens */}
            <div className="lg:col-span-1">
              <RecommendationsCard 
                onAppRestarted={() => {
                  refetchApps();
                  refetchStats();
                }} 
              />
            </div>
            
            {/* Activity Timeline - takes up 2/3 of the width on large screens */}
            <div className="lg:col-span-2">
              <ActivityTimeline />
            </div>
          </div>
          
          {/* App list */}
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="sm:flex sm:items-center">
              <div className="sm:flex-auto">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">Registered Applications</h2>
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                  Status and controls for all your registered Replit applications.
                </p>
              </div>
              <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                <div className="flex items-center">
                  <Select 
                    value={filterType} 
                    onValueChange={setFilterType}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All Apps" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Apps</SelectItem>
                      <SelectItem value={AppType.FRONTEND}>Frontend</SelectItem>
                      <SelectItem value={AppType.BACKEND}>Backend</SelectItem>
                      <SelectItem value={AppType.DATABASE}>Database</SelectItem>
                      <SelectItem value={AppType.OTHER}>Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="mt-6 overflow-x-auto">
              {/* Application Grid */}
              {isLoading ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {[...Array(3)].map((_, index) => (
                    <div key={index} className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden p-6 animate-pulse">
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4 w-2/3"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-4 w-1/3"></div>
                      <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : filteredApps.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-gray-500 dark:text-gray-400">No applications found. Add your first Replit app to get started!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredApps.map((app: ReplitApp) => (
                    <AppCard
                      key={app.id}
                      app={app}
                      onStatusChange={() => {
                        refetchApps();
                        refetchStats();
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Modals */}
      <AddAppDialog 
        open={addAppDialogOpen} 
        onOpenChange={setAddAppDialogOpen} 
        onAppAdded={handleAppAdded} 
      />
      
      <ChangeFrequencyDialog 
        open={changeFrequencyDialogOpen} 
        onOpenChange={setChangeFrequencyDialogOpen}
        currentFrequency={stats?.checkFrequency || 30}
        onFrequencyChanged={handleFrequencyChanged}
      />
    </div>
  );
}
