
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

const SettingsPage = () => {
  const { toast } = useToast();
  
  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Your settings have been successfully saved."
    });
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your system preferences and configurations.</p>
      </div>
      
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="api">API Integration</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Configure general application settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="display-name">Organization Name</Label>
                <Input id="display-name" defaultValue="City Emergency Response" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm">
                  <option value="UTC-8">Pacific Time (UTC-8)</option>
                  <option value="UTC-7">Mountain Time (UTC-7)</option>
                  <option value="UTC-6">Central Time (UTC-6)</option>
                  <option value="UTC-5">Eastern Time (UTC-5)</option>
                </select>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="dark-mode">Dark Mode</Label>
                  <div className="text-sm text-muted-foreground">
                    Use dark theme for the application interface
                  </div>
                </div>
                <Switch id="dark-mode" defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-refresh">Auto Refresh Data</Label>
                  <div className="text-sm text-muted-foreground">
                    Automatically refresh data every 30 seconds
                  </div>
                </div>
                <Switch id="auto-refresh" defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sound">Sound Alerts</Label>
                  <div className="text-sm text-muted-foreground">
                    Play sound for emergency notifications
                  </div>
                </div>
                <Switch id="sound" />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave}>Save Settings</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Configure how and when you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Emergency Alerts</Label>
                  <div className="text-sm text-muted-foreground">High priority emergencies</div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className="bg-emergency">Required</Badge>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="ambulance-status">Ambulance Status Changes</Label>
                  <div className="text-sm text-muted-foreground">When ambulance status is updated</div>
                </div>
                <Switch id="ambulance-status" defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="signal-override">Traffic Signal Overrides</Label>
                  <div className="text-sm text-muted-foreground">When a traffic signal is manually overridden</div>
                </div>
                <Switch id="signal-override" defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="system-updates">System Updates</Label>
                  <div className="text-sm text-muted-foreground">New features and maintenance alerts</div>
                </div>
                <Switch id="system-updates" />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="analytics-report">Analytics Reports</Label>
                  <div className="text-sm text-muted-foreground">Weekly performance digests</div>
                </div>
                <Switch id="analytics-report" />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave}>Save Preferences</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
              <CardDescription>Manage API keys and integrations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <div className="flex space-x-2">
                  <Input id="api-key" value="sk_live_51NQ0ApJSAR9***************" readOnly />
                  <Button variant="outline">Regenerate</Button>
                </div>
                <p className="text-sm text-muted-foreground">Your API key grants full access to your account.</p>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label>External Services</Label>
                <div className="grid gap-6">
                  <div className="flex justify-between items-center">
                    <div className="space-y-0.5">
                      <div className="font-medium">Maps API Integration</div>
                      <div className="text-sm text-muted-foreground">Connect to external mapping service</div>
                    </div>
                    <Button variant="outline">Configure</Button>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="space-y-0.5">
                      <div className="font-medium">Traffic Data Provider</div>
                      <div className="text-sm text-muted-foreground">Real-time traffic data integration</div>
                    </div>
                    <Button variant="outline">Configure</Button>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="space-y-0.5">
                      <div className="font-medium">Hospital Information System</div>
                      <div className="text-sm text-muted-foreground">Connect to hospital APIs</div>
                    </div>
                    <Button variant="outline">Configure</Button>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave}>Save Configuration</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
              <CardDescription>Advanced system settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>System Version</Label>
                <div className="flex items-center gap-2">
                  <div className="bg-muted rounded px-2.5 py-1 text-sm">v2.4.1</div>
                  <Badge variant="outline" className="text-green-500">Up to date</Badge>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>System Status</Label>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span className="font-medium">All systems operational</span>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label htmlFor="signal-timeout">Traffic Signal Control Timeout</Label>
                <div className="flex items-center gap-2">
                  <Input id="signal-timeout" type="number" defaultValue="120" />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">seconds</span>
                </div>
                <p className="text-sm text-muted-foreground">Maximum time a traffic signal will remain in emergency mode</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="data-retention">Data Retention Period</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm">
                  <option value="30">30 days</option>
                  <option value="60">60 days</option>
                  <option value="90">90 days</option>
                  <option value="180">180 days</option>
                  <option value="365">365 days</option>
                </select>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label>Danger Zone</Label>
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
                  <div className="flex flex-col gap-4">
                    <div>
                      <h4 className="font-medium text-destructive">Reset System Configuration</h4>
                      <p className="text-sm text-muted-foreground">Reset all settings to default values</p>
                    </div>
                    <Button variant="destructive">Reset Configuration</Button>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave}>Save System Settings</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
