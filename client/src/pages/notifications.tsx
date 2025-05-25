import { useState } from "react";
import { useNotifications } from "@/contexts/NotificationContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NotificationDemo from "@/components/notification-demo";
import { Bell, Settings, Clock, AlertTriangle, ArrowLeftIcon } from "lucide-react";
import Sidebar from "@/components/layout/sidebar";
import MobileHeader from "@/components/layout/mobile-header";
import { Link } from "wouter";

export default function NotificationsPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { notifications, clearNotifications } = useNotifications();
  const [settings, setSettings] = useState({
    statusNotifications: true,
    predictionNotifications: true,
    recommendationNotifications: true,
    systemNotifications: true,
    desktopNotifications: false,
    emailNotifications: false,
    notifyOnlyHighPriority: false,
    retentionDays: 7,
  });

  const handleSettingChange = (key: string, value: boolean | number) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
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
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Notifications</h1>
          </div>
        </div>
        
        {/* Notifications content */}
        <div className="flex-1 overflow-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
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
              <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
            </div>
            <Button 
              variant="outline" 
              onClick={clearNotifications}
              disabled={notifications.length === 0}
            >
              Clear All Notifications
            </Button>
          </div>

          <Tabs defaultValue="settings" className="space-y-4">
            <TabsList>
              <TabsTrigger value="settings" className="flex items-center">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                History ({notifications.length})
              </TabsTrigger>
              <TabsTrigger value="demo" className="flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Demo
              </TabsTrigger>
            </TabsList>

            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>
                    Configure what types of notifications you want to receive
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Notification Categories</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base">Status Changes</Label>
                          <p className="text-sm text-muted-foreground">
                            Notifications when applications change status
                          </p>
                        </div>
                        <Switch 
                          checked={settings.statusNotifications} 
                          onCheckedChange={(checked) => handleSettingChange('statusNotifications', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base">Predictions</Label>
                          <p className="text-sm text-muted-foreground">
                            Notifications about application failure predictions
                          </p>
                        </div>
                        <Switch 
                          checked={settings.predictionNotifications} 
                          onCheckedChange={(checked) => handleSettingChange('predictionNotifications', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base">Recommendations</Label>
                          <p className="text-sm text-muted-foreground">
                            Restart and optimization recommendations
                          </p>
                        </div>
                        <Switch 
                          checked={settings.recommendationNotifications} 
                          onCheckedChange={(checked) => handleSettingChange('recommendationNotifications', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base">System Notifications</Label>
                          <p className="text-sm text-muted-foreground">
                            System-wide updates, changes, and events
                          </p>
                        </div>
                        <Switch 
                          checked={settings.systemNotifications} 
                          onCheckedChange={(checked) => handleSettingChange('systemNotifications', checked)}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Delivery Methods</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base">In-App Notifications</Label>
                          <p className="text-sm text-muted-foreground">
                            Show notifications within the application
                          </p>
                        </div>
                        <Switch checked={true} disabled />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base">Desktop Notifications</Label>
                          <p className="text-sm text-muted-foreground">
                            Show desktop notifications when browser is open
                          </p>
                        </div>
                        <Switch 
                          checked={settings.desktopNotifications} 
                          onCheckedChange={(checked) => handleSettingChange('desktopNotifications', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base">Email Notifications</Label>
                          <p className="text-sm text-muted-foreground">
                            Send notifications to your email address
                          </p>
                        </div>
                        <Switch 
                          checked={settings.emailNotifications} 
                          onCheckedChange={(checked) => handleSettingChange('emailNotifications', checked)}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Additional Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base">High Priority Only</Label>
                          <p className="text-sm text-muted-foreground">
                            Only notify for high priority events
                          </p>
                        </div>
                        <Switch 
                          checked={settings.notifyOnlyHighPriority} 
                          onCheckedChange={(checked) => handleSettingChange('notifyOnlyHighPriority', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base">Retention Period</Label>
                          <p className="text-sm text-muted-foreground">
                            Keep notifications for {settings.retentionDays} days
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleSettingChange('retentionDays', Math.max(1, settings.retentionDays - 1))}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center">{settings.retentionDays}</span>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleSettingChange('retentionDays', Math.min(30, settings.retentionDays + 1))}
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full sm:w-auto">Save Settings</Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              {notifications.length === 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Notification History</CardTitle>
                    <CardDescription>You don't have any notifications yet</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                      <Bell className="h-12 w-12 mb-4 opacity-20" />
                      <h3 className="text-lg font-medium">No Notifications</h3>
                      <p className="text-sm max-w-md">
                        Notifications will appear here when you receive them.
                        Try the demo tab to generate some test notifications.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Notification History</CardTitle>
                    <CardDescription>Your recent notifications</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {notifications.map(notification => (
                      <div 
                        key={notification.id} 
                        className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors duration-150"
                      >
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium">{notification.title}</h3>
                          <span className="text-xs text-muted-foreground">
                            {new Date(notification.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                      </div>
                    ))}
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" onClick={clearNotifications}>Clear All</Button>
                  </CardFooter>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="demo">
              <NotificationDemo />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}