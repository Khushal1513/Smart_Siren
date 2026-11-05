/**
 * @file MissionsPage.jsx
 * @description Main Missions test console page combining all domain components.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useMissions } from '../hooks/useMissions.js';
import { useMissionSocket } from '../hooks/useMissionSocket.js';
import { useMissionActions } from '../hooks/useMissionActions.js';
import { missionStore, missionActions } from '../store/missionStore.js';
import { MissionTable } from '../components/domain/missions/MissionTable.jsx';
import { MissionCreateForm } from '../components/domain/missions/MissionCreateForm.jsx';
import { MissionActions } from '../components/domain/missions/MissionActions.jsx';
import { MissionDetailPanel } from '../components/domain/missions/MissionDetailPanel.jsx';
import { PositionSimulator } from '../components/domain/missions/PositionSimulator.jsx';
import { LiveEventLog } from '../components/domain/missions/LiveEventLog.jsx';
import { ConnectionIndicator } from '../components/domain/missions/ConnectionIndicator.jsx';
import { getMission } from '../services/missionApi.js';

/**
 * MissionsPage component.
 */
export default function MissionsPage() {
  const navigate = useNavigate();
  useMissionSocket();
  const { missions, loading, error, refresh } = useMissions();
  const selectedId = missionStore.useStore((s) => s.selectedId);
  const filterStatus = missionStore.useStore((s) => s.filterStatus);
  const connection = missionStore.useStore((s) => s.connection);
  const events = missionStore.useStore((s) => s.events);
  const missionsById = missionStore.useStore((s) => s.missionsById);

  const selectedMission = selectedId ? missionsById[selectedId] : null;
  const hasSelectedMissionDetails = Boolean(selectedMission && Array.isArray(selectedMission.positions));
  const [detailError, setDetailError] = useState(null);
  const actions = useMissionActions();

  useEffect(() => {
    if (!selectedId || hasSelectedMissionDetails) {
      setDetailError(null);
      return undefined;
    }

    let active = true;
    setDetailError(null);
    getMission(selectedId)
      .then((mission) => {
        if (active) missionActions.upsertMission(mission);
      })
      .catch((loadError) => {
        if (active) setDetailError(loadError.message);
      });

    return () => {
      active = false;
    };
  }, [selectedId, hasSelectedMissionDetails]);

  const handleSendBurst = async () => {
    if (!selectedMission) return;
    for (let i = 0; i < 520; i++) {
      try {
        await actions.addPosition(selectedMission._id, {
          lat: 12.9716 + i * 0.0001,
          lng: 77.5946 + i * 0.0001,
          speedKmh: 60,
          ts: new Date().toISOString(),
        });
      } catch {
        break;
      }
    }
    refresh();
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Emergency Missions Console</h1>
          <p className="text-sm text-muted-foreground">Manage preemption missions, live telemetry, and state transitions.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/simulation/live" className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent">
            Live Simulation
          </Link>
          <ConnectionIndicator status={connection} />
          <button
            onClick={refresh}
            className="bg-secondary text-secondary-foreground hover:bg-accent px-3 py-2 rounded-md text-sm font-medium"
          >
            Refresh
          </button>
        </div>
      </div>

      {(error || detailError || (actions.actionError && actions.actionError.action !== 'create')) && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {detailError || actions.actionError?.message || error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <MissionTable
            missions={missions}
            selectedId={selectedId}
            onSelect={(id) => missionActions.selectMission(id)}
            filterStatus={filterStatus}
            onFilterChange={(st) => missionActions.setFilter(st)}
            loading={loading}
          />
          <MissionDetailPanel
            mission={selectedMission}
            detailsLoading={Boolean(selectedMission && !hasSelectedMissionDetails)}
          />
        </div>

        <div className="space-y-6">
          <MissionCreateForm
            onSubmit={async (payload) => {
              await actions.createMission(payload);
              refresh();
            }}
            loading={actions.pendingAction === 'create'}
            externalError={actions.actionError?.action === 'create' ? actions.actionError : null}
          />

          <MissionActions
            mission={selectedMission}
            actions={actions}
            loading={Boolean(actions.pendingAction)}
            onActivated={({ simulation }) => {
              if (['RUNNING', 'COMPLETED'].includes(simulation.status)) {
                navigate(`/simulation/${selectedMission._id}`);
              }
            }}
          />

          <PositionSimulator
            mission={selectedMission}
            onAddPosition={actions.addPosition}
            onSendBurst={handleSendBurst}
          />

          <LiveEventLog events={events} onClear={() => missionStore.setState({ events: [] })} />
        </div>
      </div>
    </div>
  );
}