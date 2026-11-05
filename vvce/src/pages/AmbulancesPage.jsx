

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

const AmbulancesPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [ambulances, setAmbulances] = useState([]);
  const [dispatchingId, setDispatchingId] = useState(null);

  useEffect(() => {
    // Dummy data for testing
    setAmbulances([
      { id: 'AMB001', location: 'Lane 1', status: 'emergency', lane: 'L1' },
      { id: 'AMB002', location: 'Lane 2', status: 'emergency', lane: 'L2' },
      { id: 'AMB003', location: 'Lane 3', status: 'emergency', lane: 'L3' },
    ]);
  }, []);

const handleDispatch = async (id, lane) => {
  setDispatchingId(id);
  toast({ title: `Dispatching ambulance ${id}...` });

  try {
    const response = await fetch('http://localhost:8000/api/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lane, type: 'AMBULANCE' }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) {
      throw new Error(data.message || data.error || `Dispatch failed (HTTP ${response.status})`);
    }

    toast({
      title: '✅ Dispatch Successful',
      description: `Command sent to the serial port for ambulance ${id} (lane ${lane}).`,
    });
  } catch (error) {
    toast({
      title: '❌ Dispatch Failed',
      description: error instanceof Error ? error.message : 'Unexpected dispatch error.',
      variant: 'destructive',
    });
  } finally {
    setDispatchingId(null);
  }
};


  const emergencyAmbulances = ambulances.filter((a) => a.status === 'emergency');

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Test Ambulances </h2>
        <Button onClick={() => navigate('/vehicle-registration')}>
          Register New Ambulance
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Emergency Ambulance List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {emergencyAmbulances.length > 0 ? (
                emergencyAmbulances.map((ambulance) => (
                  <TableRow key={ambulance.id}>
                    <TableCell>{ambulance.id}</TableCell>
                    <TableCell>{ambulance.location}</TableCell>
                    <TableCell>
                      <Badge className="bg-red-600 text-white capitalize">
                        {ambulance.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        onClick={() => handleDispatch(ambulance.id, ambulance.lane)}
                        disabled={dispatchingId !== null}
                      >
                        {dispatchingId === ambulance.id ? 'Sending...' : 'Dispatch'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4}>No emergency ambulances found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AmbulancesPage;  