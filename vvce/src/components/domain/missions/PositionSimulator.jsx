/**
 * @file PositionSimulator.jsx
 * @description Simulator widget that sends fake GPS positions for an active mission every N seconds.
 */
import React, { useState, useEffect, useRef } from 'react';

/**
 * PositionSimulator component.
 * @param {Object} props
 * @param {Object} props.mission - Active mission object
 * @param {Function} props.onAddPosition - Function to add position
 * @param {Function} props.onSendBurst - Function to send 520 positions burst
 */
export function PositionSimulator({ mission, onAddPosition, onSendBurst }) {
  const [isRunning, setIsRunning] = useState(false);
  const [intervalSec, setIntervalSec] = useState(2);
  const [speedKmh, setSpeedKmh] = useState(65);
  const latRef = useRef(12.9716);
  const lngRef = useRef(77.5946);

  const isActive = mission && mission.status === 'ACTIVE';

  useEffect(() => {
    if (!isActive && isRunning) {
      setIsRunning(false);
    }
  }, [isActive, isRunning]);

  useEffect(() => {
    let timer = null;
    if (isRunning && isActive) {
      timer = setInterval(async () => {
        latRef.current += 0.0005;
        lngRef.current += 0.0005;
        const eta50 = Math.max(10, (mission.etaP50 || 120) - intervalSec);
        const eta90 = Math.max(15, (mission.etaP90 || 180) - intervalSec);

        try {
          await onAddPosition(mission._id, {
            lat: latRef.current,
            lng: lngRef.current,
            speedKmh,
            etaP50: eta50,
            etaP90: eta90,
            ts: new Date().toISOString(),
          });
        } catch (e) {
          setIsRunning(false);
        }
      }, intervalSec * 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRunning, isActive, intervalSec, speedKmh, mission, onAddPosition]);

  if (!mission || mission.status !== 'ACTIVE') {
    return (
      <div className="bg-card p-4 rounded-lg border shadow-sm text-center text-muted-foreground text-sm">
        Position Simulator available only when mission is ACTIVE.
      </div>
    );
  }

  return (
    <div className="bg-card p-4 rounded-lg border shadow-sm space-y-4">
      <h3 className="text-lg font-medium text-foreground">GPS Position Simulator</h3>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Interval (seconds)</label>
          <input
            type="number"
            min={1}
            max={10}
            value={intervalSec}
            onChange={(e) => setIntervalSec(Number(e.target.value))}
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-foreground"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Speed (km/h)</label>
          <input
            type="number"
            min={0}
            max={200}
            value={speedKmh}
            onChange={(e) => setSpeedKmh(Number(e.target.value))}
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-foreground"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setIsRunning(!isRunning)}
          className={`px-4 py-2 rounded-md text-sm font-medium text-white ${
            isRunning ? 'bg-amber-600 hover:bg-amber-700' : 'bg-teal-600 hover:bg-teal-700'
          }`}
        >
          {isRunning ? 'Pause Sending (Trigger Watchdog)' : 'Start Sending Positions'}
        </button>

        <button
          onClick={onSendBurst}
          className="bg-secondary text-secondary-foreground hover:bg-accent px-4 py-2 rounded-md text-sm font-medium"
        >
          Send Burst of 520 (Test Cap)
        </button>
      </div>
    </div>
  );
}