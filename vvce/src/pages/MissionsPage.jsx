/**
 * @file MissionsPage.jsx
 * @description Main Missions test console page combining all domain components.
 */
import React from 'react';
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

/**
 * MissionsPage component.
 */
export default function MissionsPage() {
  useMissionSocket();
  const { missions, loading, refresh } = useMissions();
  const selectedId = missionStore.useStore((s) => s.selectedId);
  const filterStatus = missionStore.useStore((s) => s.filterStatus);
  const connection = missionStore.useStore((s) => s.connection);
  const events = missionStore.useStore((s) => s.events);
  const missionsById = missionStore.useStore((s) => s.missionsById);

  const selectedMission = selectedId ? missionsById[selectedId] : null;
  const actions = useMissionActions();

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
      } catch (e) {
        break;
      }
    }
    refresh();
  };

  const isMock = import.meta.env.VITE_USE_MOCK === 'true' || connection === 'mock';

  return (
    <div className="space-y-6 pb-12">
      {isMock && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg flex justify-between items-center text-sm">
          <span>Simulation Mock Mode is active. All CRUD operations and socket events run in-memory.</span>
          <span className="font-semibold">VITE_USE_MOCK=true</span>
        </div>
      )}

      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Emergency Missions Console</h1>
          <p className="text-sm text-muted-foreground">Manage preemption missions, live telemetry, and state transitions.</p>
        </div>
        <div className="flex items-center gap-3">
          <ConnectionIndicator status={connection} />
          <button
            onClick={refresh}
            className="bg-secondary text-secondary-foreground hover:bg-accent px-3 py-2 rounded-md text-sm font-medium"
          >
            Refresh
          </button>
        </div>
      </div>

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
          <MissionDetailPanel mission={selectedMission} />
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

          <MissionActions mission={selectedMission} actions={actions} loading={Boolean(actions.pendingAction)} />

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