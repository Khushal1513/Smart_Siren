/**
 * @file MissionDetailPanel.jsx
 * @description Detailed view of mission attributes, route, positions trail count, and SVG polyline trail.
 */
import React from 'react';
import { MissionStatusBadge } from './MissionStatusBadge.jsx';

/**
 * MissionDetailPanel component.
 * @param {Object} props
 * @param {Object} props.mission - Selected mission object
 */
export function MissionDetailPanel({ mission, detailsLoading = false }) {
  if (!mission) {
    return (
      <div className="bg-card p-6 rounded-lg border shadow-sm text-center text-muted-foreground">
        Select a mission from the table to view details.
      </div>
    );
  }

  const positions = mission.positions || [];
  const last10 = positions.slice(-10);

  // Simple SVG polyline coordinate mapping
  const minLat = positions.length ? Math.min(...positions.map((p) => p.lat)) : 0;
  const maxLat = positions.length ? Math.max(...positions.map((p) => p.lat)) : 1;
  const minLng = positions.length ? Math.min(...positions.map((p) => p.lng)) : 0;
  const maxLng = positions.length ? Math.max(...positions.map((p) => p.lng)) : 1;

  const latSpan = maxLat - minLat || 0.001;
  const lngSpan = maxLng - minLng || 0.001;

  const points = positions
    .map((p) => {
      const x = ((p.lng - minLng) / lngSpan) * 200 + 10;
      const y = 90 - ((p.lat - minLat) / latSpan) * 80;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-bold text-foreground">Mission: {mission.vehicleId}</h3>
          <p className="text-xs text-muted-foreground font-mono">ID: {mission._id}</p>
        </div>
        <MissionStatusBadge status={mission.status} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground block text-xs">Severity</span>
          <span className="font-semibold text-foreground">{mission.severity || 3}</span>
        </div>
        <div>
          <span className="text-muted-foreground block text-xs">ETA P50 / P90</span>
          <span className="font-semibold text-foreground">
            {mission.etaP50 ?? 'Not set'} / {mission.etaP90 ?? 'Not set'}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground block text-xs">Positions Count</span>
          <span className="font-semibold text-foreground">{positions.length} / 500</span>
        </div>
        <div>
          <span className="text-muted-foreground block text-xs">Abort Reason</span>
          <span className="font-semibold text-foreground">{mission.abortReason || 'None'}</span>
        </div>
      </div>

      {mission.route && mission.route.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-foreground mb-1">Route Signals</h4>
          <div className="flex flex-wrap gap-2">
            {mission.route.map((r, i) => (
              <span key={i} className="bg-secondary text-secondary-foreground text-xs px-2.5 py-1 rounded-md">
                {r.signalId} ({r.distanceAlongRouteM}m)
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="text-sm font-medium text-foreground mb-1">Position Trail Preview</h4>
        <div className="bg-background border rounded-md p-2 h-32 flex items-center justify-center relative overflow-hidden">
          {detailsLoading ? (
            <span className="text-xs text-muted-foreground">Loading mission details...</span>
          ) : positions.length < 2 ? (
            <span className="text-xs text-muted-foreground">Waiting for position data...</span>
          ) : (
            <svg className="w-full h-full" viewBox="0 0 220 100">
              <polyline fill="none" stroke="#2563eb" strokeWidth="3" points={points} />
            </svg>
          )}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-foreground mb-1">Last Positions</h4>
        <div className="max-h-32 overflow-y-auto text-xs font-mono bg-muted p-2 rounded-md space-y-1">
          {last10.length === 0 ? (
            <p className="text-muted-foreground">No positions recorded yet.</p>
          ) : (
            last10.map((p, i) => (
              <div key={i} className="flex justify-between text-muted-foreground">
                <span>
                  Lat: {p.lat.toFixed(4)}, Lng: {p.lng.toFixed(4)}
                </span>
                <span>{p.speedKmh} km/h</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}