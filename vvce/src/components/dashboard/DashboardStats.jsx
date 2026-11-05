import React from 'react';
import { Clock, FileBarChart, Gauge, MapPin, Navigation } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { missionStore } from '@/store/missionStore.js';

export const DashboardStats = () => {
  const missionsById = missionStore.useStore((state) => state.missionsById);
  const order = missionStore.useStore((state) => state.order);
  const activeMissionCount = order.reduce(
    (count, id) => count + (missionsById[id]?.status === 'ACTIVE' ? 1 : 0),
    0
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center  justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Ambulances</CardTitle>
          <Gauge className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeMissionCount}</div>
          <p className="text-xs text-muted-foreground">
            Currently on active missions
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg. Response Time</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">8.2 min</div>
          <p className="text-xs text-muted-foreground">
            -1.5 min from last week
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Controlled Signals</CardTitle>
          <MapPin className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">142</div>
          <p className="text-xs text-muted-foreground">
            +35 from last month
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">AI Route Efficiency</CardTitle>
          <Navigation className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">+24.5%</div>
          <p className="text-xs text-muted-foreground">
            Compared to traditional routing
          </p>
        </CardContent>
      </Card>
    </div>
  );
};