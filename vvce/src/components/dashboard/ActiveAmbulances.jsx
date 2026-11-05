import React, { useEffect, useState } from 'react';
import { AlertCircle, Ambulance } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MissionStatusBadge } from '@/components/domain/missions/MissionStatusBadge.jsx';
import { MissionDetailPanel } from '@/components/domain/missions/MissionDetailPanel.jsx';
import { useMissionSocket } from '@/hooks/useMissionSocket.js';
import { getMission, listMissions } from '@/services/missionApi.js';
import { missionActions, missionStore } from '@/store/missionStore.js';

export const ActiveAmbulances = () => {
  useMissionSocket();

  const missionsById = missionStore.useStore((state) => state.missionsById);
  const order = missionStore.useStore((state) => state.order);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    let active = true;

    listMissions({ limit: 200 })
      .then((response) => {
        if (active) missionActions.setMissions(response.data);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const emergencyMissions = order
    .map((id) => missionsById[id])
    .filter((mission) => mission && ['CREATED', 'ACTIVE'].includes(mission.status))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const selectedMission = selectedId ? missionsById[selectedId] : null;
  const selectedMissionId = selectedMission?._id;
  const hasMissionDetails = Array.isArray(selectedMission?.positions);

  useEffect(() => {
    if (!selectedMissionId || hasMissionDetails) {
      setDetailError('');
      setDetailsLoading(false);
      return undefined;
    }

    let active = true;
    setDetailsLoading(true);
    setDetailError('');
    getMission(selectedMissionId)
      .then((mission) => {
        if (active) missionActions.upsertMission(mission);
      })
      .catch((loadError) => {
        if (active) setDetailError(loadError.message);
      })
      .finally(() => {
        if (active) setDetailsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedMissionId, hasMissionDetails]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg font-medium">
          <Ambulance className="h-5 w-5" />
          Emergency Ambulances
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && emergencyMissions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Loading missions...</p>
        ) : error ? (
          <p role="alert" className="text-sm text-destructive">{error}</p>
        ) : emergencyMissions.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>No created or active missions.</span>
          </div>
        ) : (
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {emergencyMissions.map((mission) => (
              <button
                key={mission._id}
                type="button"
                aria-pressed={selectedId === mission._id}
                onClick={() => setSelectedId(mission._id)}
                className={`flex w-full items-center justify-between gap-3 rounded-md border p-3 text-left transition-colors ${
                  selectedId === mission._id
                    ? 'border-primary bg-accent'
                    : 'border-border hover:bg-accent/50'
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{mission.vehicleId}</span>
                  <span className="block text-xs text-muted-foreground">
                    Severity {mission.severity ?? 3}
                  </span>
                </span>
                <MissionStatusBadge status={mission.status} />
              </button>
            ))}
          </div>
        )}

        {detailError && <p role="alert" className="text-sm text-destructive">{detailError}</p>}
        {selectedMission && (
          <MissionDetailPanel mission={selectedMission} detailsLoading={detailsLoading} />
        )}
      </CardContent>
    </Card>
  );
};
