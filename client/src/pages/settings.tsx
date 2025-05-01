import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSettings, updateSettings } from '@/lib/api';
import Sidebar from '@/components/layout/sidebar';
import MobileHeader from '@/components/layout/mobile-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Clock, Save } from 'lucide-react';

export default function Settings() {
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Fetch settings
  const { data: settings, isLoading, refetch } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: () => getSettings(),
  });
  
  // Settings form state
  const [checkFrequency, setCheckFrequency] = useState(settings?.checkFrequency || 30);
  const [autoRestart, setAutoRestart] = useState(settings?.autoRestart || false);
  
  // Update when settings load
  useState(() => {
    if (settings) {
      setCheckFrequency(settings.checkFrequency);
      setAutoRestart(settings.autoRestart);
    }
  });
  
  const handleSaveSettings = async () => {
    setIsSubmitting(true);
    try {
      await updateSettings({
        checkFrequency,
        autoRestart
      });
      toast({
        title: "Settings Saved",
        description: "Your settings have been updated successfully."
      });
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
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
          <div className="px-4 sm:px-6 lg:px-8 py-4 md:py-6">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Settings</h1>
          </div>
        </div>
        
        {/* Settings content */}
        <div className="flex-1 overflow-auto">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="max-w-3xl mx-auto">
              {isLoading ? (
                <div className="space-y-4">
                  <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Monitoring Settings</CardTitle>
                      <CardDescription>
                        Configure how Tech Portal monitors your Replit applications
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="check-frequency">Check Frequency (seconds)</Label>
                          <span className="text-sm font-medium">{checkFrequency}s</span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <Slider
                            id="check-frequency"
                            value={[checkFrequency]}
                            min={5}
                            max={300}
                            step={5}
                            onValueChange={(value) => setCheckFrequency(value[0])}
                            className="flex-1"
                          />
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 pt-1">
                          How often to check the status of your applications. Lower values provide more frequent updates but increase system load.
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-3">
                        <div>
                          <Label htmlFor="auto-restart" className="block mb-1">Auto-Restart Apps</Label>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Automatically restart applications that are found to be unreachable
                          </p>
                        </div>
                        <Switch 
                          id="auto-restart" 
                          checked={autoRestart} 
                          onCheckedChange={setAutoRestart} 
                        />
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-end">
                      <Button 
                        onClick={handleSaveSettings} 
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Settings
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Notification Settings</CardTitle>
                      <CardDescription>
                        Configure how you receive notifications about your applications
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="email-notifications" className="block mb-1">Email Notifications</Label>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Receive email notifications for important alerts
                            </p>
                          </div>
                          <Switch id="email-notifications" />
                        </div>
                        
                        <div className="pt-2">
                          <Label htmlFor="email-address">Email Address</Label>
                          <Input 
                            id="email-address" 
                            type="email" 
                            placeholder="Enter your email address" 
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="text-xs text-gray-500 dark:text-gray-400">
                      Notification settings are saved automatically
                    </CardFooter>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}