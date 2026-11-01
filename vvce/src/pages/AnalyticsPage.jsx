
import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, ArrowUp, ArrowDown, Clock, MapPin, Navigation } from 'lucide-react';

import {
  LineChart as ReChartsLineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#2a9d8f', '#e9c46a', '#e76f51', '#8d99ae', '#457b9d'];

const AnalyticsPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <div className="flex items-center gap-2">
          <select className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last 365 days</option>
          </select>
          <Button variant="outline">
            Export
          </Button>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Response Time"
          value="8.2 min"
          change="-12%"
          trend="down"
          description="Average time from call to arrival"
        />
        <MetricCard
          title="Signals Optimized"
          value="3,142"
          change="+24%"
          trend="up"
          description="Traffic signals automatically adjusted"
        />
        <MetricCard
          title="Emergency Calls"
          value="527"
          change="+7%"
          trend="up"
          description="Total emergency dispatches"
        />
        <MetricCard
          title="Time Saved"
          value="1,322 hrs"
          change="+31%"
          trend="up"
          description="Estimated total response time saved"
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Response Time by District</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: 'Downtown', time: 5.2 },
                    { name: 'North', time: 8.7 },
                    { name: 'South', time: 6.3 },
                    { name: 'East', time: 9.1 },
                    { name: 'West', time: 7.5 },
                    { name: 'Central', time: 4.8 },
                  ]}
                  margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value) => [`${value} min`, 'Response Time']} />
                  <Bar dataKey="time" fill="#2a9d8f" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Emergency Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Medical', value: 42 },
                      { name: 'Traffic', value: 28 },
                      { name: 'Fire', value: 15 },
                      { name: 'Other', value: 15 },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    fill="#8884d8"
                    paddingAngle={1}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {[0, 1, 2, 3].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" height={36} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Percentage']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="response-time">
            <TabsList className="mb-4">
              <TabsTrigger value="response-time">Response Time</TabsTrigger>
              <TabsTrigger value="dispatches">Dispatches</TabsTrigger>
              <TabsTrigger value="traffic">Traffic Efficiency</TabsTrigger>
            </TabsList>
            
            <TabsContent value="response-time">
              
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ReChartsLineChart
                    data={[
                      { day: '04/06', count: 12, avg: 9.2 },
                      { day: '04/07', count: 18, avg: 8.7 },
                      { day: '04/08', count: 15, avg: 9.3 },
                      { day: '04/09', count: 20, avg: 8.5 },
                      { day: '04/10', count: 25, avg: 7.8 },
                      { day: '04/11', count: 22, avg: 8.1 },
                      { day: '04/12', count: 30, avg: 7.5 },
                      { day: '04/13', count: 28, avg: 7.2 },
                      { day: '04/14', count: 32, avg: 6.8 },
                      { day: '04/15', count: 35, avg: 6.2 },
                      { day: '04/16', count: 30, avg: 6.5 },
                      { day: '04/17', count: 25, avg: 5.9 },
                      { day: '04/18', count: 27, avg: 5.5 },
                      { day: '04/19', count: 32, avg: 5.2 },
                    ]}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis yAxisId="left" orientation="left" stroke="#e76f51" />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#2a9d8f"
                      domain={[0, 12]}
                    />
                    <Tooltip />
                    <Legend />
                    <Line
                      yAxisId="left"
                      name="Emergency Calls"
                      type="monotone"
                      dataKey="count"
                      stroke="#e76f51"
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="right"
                      name="Avg. Response Time (min)"
                      type="monotone"
                      dataKey="avg"
                      stroke="#2a9d8f"
                      strokeWidth={2}
                    />
                  </ReChartsLineChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
            
            <TabsContent value="dispatches">
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-muted-foreground">Select a date range to view dispatch data</p>
              </div>
            </TabsContent>
            
            <TabsContent value="traffic">
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-muted-foreground">Select a date range to view traffic efficiency data</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter>
          <Button variant="outline">View Detailed Report</Button>
        </CardFooter>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Signal Override Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Total Overrides</p>
                  <p className="text-2xl font-bold">1,287</p>
                </div>
                <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Top Override Locations</p>
                <ul className="space-y-2">
                  {[
                    { location: 'Main St & 5th Ave', count: 87 },
                    { location: 'Market St & 3rd Ave', count: 64 },
                    { location: 'Broadway & 9th St', count: 51 },
                    { location: 'Park Ave & 12th St', count: 49 },
                    { location: 'West End & River Rd', count: 42 },
                  ].map((item, i) => (
                    <li key={i} className="flex justify-between items-center text-sm">
                      <span>{item.location}</span>
                      <span className="font-medium">{item.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>AI Optimization Impact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-primary/10 rounded-lg p-4 text-center">
                  <p className="text-xl font-bold">24.5%</p>
                  <p className="text-sm text-muted-foreground">Average Time Saved</p>
                </div>
                <div className="bg-primary/10 rounded-lg p-4 text-center">
                  <p className="text-xl font-bold">87.3%</p>
                  <p className="text-sm text-muted-foreground">Signal Coordination</p>
                </div>
                <div className="bg-primary/10 rounded-lg p-4 text-center">
                  <p className="text-xl font-bold">94.1%</p>
                  <p className="text-sm text-muted-foreground">Route Adherence</p>
                </div>
              </div>
              
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: 'Downtown', traditional: 8.5, optimized: 5.2 },
                      { name: 'North', traditional: 12.3, optimized: 8.7 },
                      { name: 'South', traditional: 9.8, optimized: 6.3 },
                      { name: 'East', traditional: 13.5, optimized: 9.1 },
                      { name: 'West', traditional: 11.2, optimized: 7.5 },
                    ]}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value} min`, 'Response Time']} />
                    <Legend />
                    <Bar name="Traditional Routing" dataKey="traditional" fill="#e76f51" />
                    <Bar name="AI Optimized" dataKey="optimized" fill="#2a9d8f" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, change, trend, description }) => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center mt-1">
          {trend === 'up' ? (
            <span className="text-green-500 flex items-center text-xs">
              <ArrowUp className="h-3 w-3 mr-1" />
              {change}
            </span>
          ) : (
            <span className="text-green-500 flex items-center text-xs">
              <ArrowDown className="h-3 w-3 mr-1" />
              {change}
            </span>
          )}
          <span className="text-xs text-muted-foreground ml-2">
            {description}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default AnalyticsPage;
