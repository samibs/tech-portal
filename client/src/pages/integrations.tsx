import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import Sidebar from '@/components/layout/sidebar';
import MobileHeader from '@/components/layout/mobile-header';
import { useQuery } from '@tanstack/react-query';
import { getSettings, updateSettings, sendTestEmail } from '@/lib/api';
import { Mail, Send, Server, Key, User } from 'lucide-react';

export default function IntegrationsPage() {
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  
  // Fetch settings
  const { data: settings, refetch } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: () => getSettings(),
  });
  
  // Email settings form state
  const [enableEmails, setEnableEmails] = useState(settings?.enableEmails || false);
  const [emailAddress, setEmailAddress] = useState(settings?.emailAddress || '');
  const [smtpHost, setSmtpHost] = useState(settings?.smtpHost || '');
  const [smtpPort, setSmtpPort] = useState(settings?.smtpPort || 587);
  const [smtpUser, setSmtpUser] = useState(settings?.smtpUser || '');
  const [smtpPassword, setSmtpPassword] = useState(settings?.smtpPassword || '');
  const [smtpSender, setSmtpSender] = useState(settings?.smtpSender || '');
  
  // Update when settings load
  useState(() => {
    if (settings) {
      setEnableEmails(settings.enableEmails || false);
      setEmailAddress(settings.emailAddress || '');
      setSmtpHost(settings.smtpHost || '');
      setSmtpPort(settings.smtpPort || 587);
      setSmtpUser(settings.smtpUser || '');
      setSmtpPassword(settings.smtpPassword || '');
      setSmtpSender(settings.smtpSender || '');
    }
  });
  
  const handleSaveEmailSettings = async () => {
    setIsSubmitting(true);
    try {
      await updateSettings({
        enableEmails,
        emailAddress,
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPassword,
        smtpSender
      });
      toast({
        title: "Email Settings Saved",
        description: "Your email notification settings have been updated successfully."
      });
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save email settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleTestEmail = async () => {
    if (!testEmailAddress) {
      toast({
        title: "Error",
        description: "Please enter an email address to send the test to.",
        variant: "destructive"
      });
      return;
    }
    
    setIsTesting(true);
    try {
      const result = await sendTestEmail(testEmailAddress);
      
      if (result.success) {
        toast({
          title: "Test Email Sent",
          description: "A test email has been sent to the address you provided."
        });
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to send test email. Check your SMTP configuration.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send test email. Please check your settings and try again.",
        variant: "destructive"
      });
    } finally {
      setIsTesting(false);
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
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Integrations</h1>
          </div>
        </div>
        
        {/* Settings content */}
        <div className="flex-1 overflow-auto">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="max-w-3xl mx-auto">
              <Tabs defaultValue="email">
                <TabsList className="mb-6">
                  <TabsTrigger value="email" className="flex items-center">
                    <Mail className="mr-2 h-4 w-4" />
                    Email
                  </TabsTrigger>
                  <TabsTrigger value="sendgrid" className="flex items-center">
                    <Send className="mr-2 h-4 w-4" />
                    SendGrid
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="email">
                  <Card>
                    <CardHeader>
                      <CardTitle>Email Notification Settings</CardTitle>
                      <CardDescription>
                        Configure how you receive email notifications about your applications
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="enable-emails" className="text-base">Enable Email Notifications</Label>
                              <p className="text-sm text-muted-foreground">
                                Receive email alerts when an application status changes
                              </p>
                            </div>
                            <Switch
                              id="enable-emails"
                              checked={enableEmails}
                              onCheckedChange={setEnableEmails}
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="notification-email">Notification Email</Label>
                            <Input
                              id="notification-email"
                              type="email"
                              value={emailAddress}
                              onChange={(e) => setEmailAddress(e.target.value)}
                              placeholder="you@example.com"
                              className="mt-1"
                              disabled={!enableEmails}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              The email address where you want to receive notifications
                            </p>
                          </div>
                        </div>
                        
                        <div className="border-t pt-5 mt-2">
                          <h3 className="text-sm font-medium mb-3">SMTP Server Configuration</h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="smtp-host">
                                <Server className="h-4 w-4 inline mr-1" />
                                SMTP Host
                              </Label>
                              <Input
                                id="smtp-host"
                                value={smtpHost}
                                onChange={(e) => setSmtpHost(e.target.value)}
                                placeholder="smtp.example.com"
                                className="mt-1"
                                disabled={!enableEmails}
                              />
                            </div>
                            
                            <div>
                              <Label htmlFor="smtp-port">
                                <Server className="h-4 w-4 inline mr-1" />
                                SMTP Port
                              </Label>
                              <Input
                                id="smtp-port"
                                type="number"
                                value={smtpPort}
                                onChange={(e) => setSmtpPort(parseInt(e.target.value))}
                                placeholder="587"
                                className="mt-1"
                                disabled={!enableEmails}
                              />
                            </div>
                            
                            <div>
                              <Label htmlFor="smtp-user">
                                <User className="h-4 w-4 inline mr-1" />
                                SMTP Username
                              </Label>
                              <Input
                                id="smtp-user"
                                value={smtpUser}
                                onChange={(e) => setSmtpUser(e.target.value)}
                                placeholder="username@example.com"
                                className="mt-1"
                                disabled={!enableEmails}
                              />
                            </div>
                            
                            <div>
                              <Label htmlFor="smtp-password">
                                <Key className="h-4 w-4 inline mr-1" />
                                SMTP Password
                              </Label>
                              <Input
                                id="smtp-password"
                                type="password"
                                value={smtpPassword}
                                onChange={(e) => setSmtpPassword(e.target.value)}
                                placeholder="••••••••"
                                className="mt-1"
                                disabled={!enableEmails}
                              />
                            </div>
                            
                            <div className="md:col-span-2">
                              <Label htmlFor="smtp-sender">Sender Email</Label>
                              <Input
                                id="smtp-sender"
                                type="email"
                                value={smtpSender}
                                onChange={(e) => setSmtpSender(e.target.value)}
                                placeholder="notifications@yourdomain.com"
                                className="mt-1"
                                disabled={!enableEmails}
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                The email address that will appear as the sender
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-4 w-full">
                      <div className="border-t pt-4 w-full">
                        <h3 className="text-sm font-medium mb-3">Test Your Configuration</h3>
                        <div className="flex items-end gap-4">
                          <div className="flex-1">
                            <Label htmlFor="test-email">Send Test Email To</Label>
                            <Input
                              id="test-email"
                              type="email"
                              value={testEmailAddress}
                              onChange={(e) => setTestEmailAddress(e.target.value)}
                              placeholder="recipient@example.com"
                              className="mt-1"
                              disabled={!enableEmails}
                            />
                          </div>
                          <Button 
                            onClick={handleTestEmail} 
                            disabled={!enableEmails || isTesting || !smtpHost || !smtpUser || !smtpPassword}
                            variant="outline"
                          >
                            {isTesting ? "Sending..." : "Send Test Email"}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Save your settings before testing. The test email will be sent to the address you specify.
                        </p>
                      </div>
                      
                      <div className="flex justify-end w-full">
                        <Button 
                          onClick={handleSaveEmailSettings} 
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? "Saving..." : "Save Email Settings"}
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                </TabsContent>
                
                <TabsContent value="sendgrid">
                  <Card>
                    <CardHeader>
                      <CardTitle>SendGrid Integration</CardTitle>
                      <CardDescription>
                        Using SendGrid for sending email notifications
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-md border border-blue-200 dark:border-blue-800">
                        <h3 className="text-blue-800 dark:text-blue-300 font-medium mb-2">About SendGrid</h3>
                        <p className="text-sm text-blue-700 dark:text-blue-400">
                          SendGrid is a cloud-based email service that allows you to send emails without maintaining email servers.
                          It helps ensure high deliverability and provides analytics on your email campaigns.
                        </p>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-medium mb-2">Setting up SendGrid</h3>
                        <ol className="list-decimal list-inside space-y-2 text-sm">
                          <li>Create a SendGrid account at <a href="https://sendgrid.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">sendgrid.com</a></li>
                          <li>Verify your domain or use single sender verification</li>
                          <li>Create an API key in the SendGrid dashboard</li>
                          <li>Enter the SendGrid SMTP details in the Email tab:</li>
                        </ol>
                        <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono">
                          <p>SMTP Host: <span className="text-blue-600 dark:text-blue-400">smtp.sendgrid.net</span></p>
                          <p>SMTP Port: <span className="text-blue-600 dark:text-blue-400">587</span></p>
                          <p>SMTP Username: <span className="text-blue-600 dark:text-blue-400">apikey</span></p>
                          <p>SMTP Password: <span className="text-blue-600 dark:text-blue-400">your_sendgrid_api_key</span></p>
                        </div>
                      </div>
                      
                      <div className="border-t pt-4 mt-2">
                        <h3 className="text-lg font-medium mb-2">SendGrid Advantages</h3>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          <li>High email deliverability rates</li>
                          <li>Detailed email analytics</li>
                          <li>Email templates and design tools</li>
                          <li>Reputation monitoring</li>
                          <li>24/7 customer support</li>
                        </ul>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button variant="outline" asChild>
                        <a href="https://docs.sendgrid.com/for-developers/sending-email/smtp-integration" target="_blank" rel="noopener noreferrer">
                          View SendGrid Documentation
                        </a>
                      </Button>
                    </CardFooter>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}