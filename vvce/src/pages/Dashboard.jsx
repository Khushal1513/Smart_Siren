import React from 'react';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import MapView from '@/components/dashboard/Mapview';

import { ActiveAmbulances } from '@/components/dashboard/ActiveAmbulances';
import { TrafficSignalsList } from '@/components/dashboard/TrafficSignals';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Ambulance, BarChart3, Gauge } from 'lucide-react';

const Dashboard = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Emergency Response Dashboard</h1>
        <Tabs defaultValue="overview" className="w-[300px]">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <DashboardStats />
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <MapView />
        <div className="space-y-6">
          <ActiveAmbulances />
          <TrafficSignalsList />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;