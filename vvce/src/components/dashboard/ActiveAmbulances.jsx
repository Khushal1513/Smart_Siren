import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, Navigation } from 'lucide-react';
import axios from 'axios';

const getStatusBadge = (status) => {
  switch (status) {
    case 'emergency':
      return <Badge className="bg-emergency">Emergency</Badge>;
    case 'active':
      return <Badge variant="outline" className="bg-signal-green text-white">Active</Badge>;
    case 'idle':
      return <Badge variant="outline">Idle</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
};

export const ActiveAmbulances = () => {
  const [ambulances, setAmbulances] = useState([]);

  useEffect(() => {
    const fetchAmbulances = async () => {
      try {
        const res = await axios.get('http://localhost:8000/api/vehicle/active'); // Change URL if needed
        setAmbulances(res.data);
      } catch (error) {
        console.error('Error fetching ambulances:', error);
      }
    };
    fetchAmbulances();
  }, []);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Active Ambulances</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {ambulances.map((ambulance) => (
            <div
              key={ambulance._id}
              className={`flex items-center justify-between border-b pb-4 last:border-0 last:pb-0 ${
                ambulance.status === 'emergency' ? 'bg-emergency/5 -mx-6 px-6' : ''
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{`Ambulance ${ambulance.ambulanceId}`}</span>
                  {getStatusBadge(ambulance.status)}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{ambulance.location}</span>
                </div>
                {ambulance.destination && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Navigation className="h-3.5 w-3.5" />
                    <span>To: {ambulance.destination}</span>
                  </div>
                )}
              </div>
              <div className="text-right">
                {ambulance.eta && (
                  <div className="flex items-center justify-end gap-1 font-medium">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{ambulance.eta}</span>
                  </div>
                )}
                {ambulance.optimizedSignals > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {ambulance.optimizedSignals} signals optimized
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
