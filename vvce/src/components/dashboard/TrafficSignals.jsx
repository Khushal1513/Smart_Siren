import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';

const getStatusClass = (status) => {
  switch (status) {
    case 'green':
      return 'signal-status-green';
    case 'yellow':
      return 'signal-status-yellow';
    case 'red':
      return 'signal-status-red';
    default:
      return '';
  }
};

export const TrafficSignalsList = () => {
  // This would come from an API in a real application
  const signals = [
    {
      id: 'TS-001',
      location: 'Main St & 5th Ave',
      status: 'green',
      controlledBy: 'Ambulance #103',
      nextChange: '35s',
    },
    {
      id: 'TS-008',
      location: 'Market St & 3rd Ave',
      status: 'green',
      controlledBy: 'Ambulance #103',
      nextChange: '25s',
    },
    {
      id: 'TS-015',
      location: 'Park Ave & 12th St',
      status: 'green',
      controlledBy: 'Ambulance #105',
      nextChange: '40s',
    },
    {
      id: 'TS-022',
      location: 'Broadway & 9th St',
      status: 'red',
      controlledBy: null,
      nextChange: '15s',
    },
    {
      id: 'TS-031',
      location: 'West End & River Rd',
      status: 'yellow',
      controlledBy: 'Ambulance #108',
      nextChange: '5s',
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Traffic Signal Control</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {signals.map((signal) => (
            <div key={signal.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{signal.location}</span>
                  <span className={getStatusClass(signal.status)}>{signal.status.toUpperCase()}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {signal.controlledBy ? (
                    <span className="text-emergency">Controlled by {signal.controlledBy}</span>
                  ) : (
                    <span>Regular operation</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <Clock className="h-3.5 w-3.5" />
                <span>Next change: {signal.nextChange}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
