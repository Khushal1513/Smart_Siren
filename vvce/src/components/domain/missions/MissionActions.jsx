/**
 * @file MissionActions.jsx
 * @description Action buttons for mission lifecycle state transitions with legal check and illegal bypass toggle.
 */
import React, { useState } from 'react';
import { canTransition } from './missionTransitions.js';
import { Trash2 } from 'lucide-react';

/**
 * MissionActions component.
 * @param {Object} props
 * @param {Object} props.mission - Current mission object
 * @param {Object} props.actions - Action dispatch functions
 * @param {boolean} props.loading - Loading state
 */
export function MissionActions({ mission, actions, loading }) {
  const [abortReason, setAbortReason] = useState('');
  const [bypassIllegal, setBypassIllegal] = useState(false);

  if (!mission) {
    return (
      <div className="bg-card p-4 rounded-lg border shadow-sm text-center text-muted-foreground text-sm">
        Select a mission to view actions.
      </div>
    );
  }

  const currentStatus = mission.status;
  const handleAction = async (targetStatus, apiFn) => {
    if (!bypassIllegal && !canTransition(currentStatus, targetStatus)) {
      alert(`Illegal transition from ${currentStatus} to ${targetStatus}`);
      return;
    }
    try {
      await apiFn();
    } catch {
      // The action hook exposes the error to the page.
    }
  };

  return (
    <div className="bg-card p-4 rounded-lg border shadow-sm space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-foreground">Mission Control ({mission.vehicleId})</h3>
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={bypassIllegal}
            onChange={(e) => setBypassIllegal(e.target.checked)}
            className="rounded border-input"
          />
          Bypass transition rules (Test 409)
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          disabled={loading || (!bypassIllegal && !canTransition(currentStatus, 'ACTIVE'))}
          onClick={() => handleAction('ACTIVE', () => actions.activateMission(mission._id))}
          className="bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-2 rounded-md text-sm font-medium disabled:opacity-40"
        >
          Activate
        </button>

        <button
          disabled={loading || (!bypassIllegal && !canTransition(currentStatus, 'ARRIVED'))}
          onClick={() => handleAction('ARRIVED', () => actions.markArrived(mission._id))}
          className="bg-teal-600 text-white hover:bg-teal-700 px-3 py-2 rounded-md text-sm font-medium disabled:opacity-40"
        >
          Mark Arrived
        </button>

        <button
          disabled={loading || (!bypassIllegal && !canTransition(currentStatus, 'CLOSED'))}
          onClick={() => handleAction('CLOSED', () => actions.closeMission(mission._id))}
          className="bg-gray-600 text-white hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium disabled:opacity-40"
        >
          Close
        </button>
      </div>

      <div className="border-t pt-3 space-y-2">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Abort reason (optional)"
            value={abortReason}
            onChange={(e) => setAbortReason(e.target.value)}
            maxLength={200}
            className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground"
          />
          <button
            disabled={loading || (!bypassIllegal && !canTransition(currentStatus, 'ABORTED'))}
            onClick={() => handleAction('ABORTED', () => actions.abortMission(mission._id, abortReason))}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 px-3 py-2 rounded-md text-sm font-medium disabled:opacity-40"
          >
            Abort
          </button>
        </div>
      </div>

      <div className="border-t pt-3">
        <button
          type="button"
          disabled={loading}
          onClick={async () => {
            if (!window.confirm(`Permanently delete the mission for ${mission.vehicleId}?`)) return;
            try {
              await actions.deleteMission(mission._id);
            } catch {
              // The action hook exposes the error to the page.
            }
          }}
          className="inline-flex items-center gap-2 rounded-md bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Delete Mission
        </button>
      </div>
    </div>
  );
}