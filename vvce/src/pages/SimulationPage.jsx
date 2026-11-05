import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { getMission } from '../services/missionApi.js';
import { getSimulationConfig, getSimulationRun } from '../services/simulationApi.js';
import { initSocket, onStatus, subscribeEvent } from '../services/socketClient.js';

const STALE_AFTER_MS = 15000;

function SimulationMap({ run, network }) {
  const nodes = useMemo(() => new Map((network?.nodes || []).map((node) => [node.id, node])), [network]);
  const routeEdges = useMemo(() => new Set(run?.route || []), [run?.route]);
  const maxX = Math.max(1200, ...(network?.nodes || []).map((node) => node.x));
  const maxY = Math.max(300, ...(network?.nodes || []).map((node) => node.y));

  if (!network?.edges?.length) {
    return <div className="p-6 text-sm text-muted-foreground">Synthetic corridor map is unavailable.</div>;
  }

  return (
    <div>
      <svg
        role="img"
        aria-label="Synthetic SUMO corridor and ambulance route"
        viewBox={`-40 -40 ${maxX + 80} ${maxY + 80}`}
        className="h-72 w-full rounded-md bg-slate-50"
      >
        {(network.edges || []).map((edge) => {
          const from = nodes.get(edge.from);
          const to = nodes.get(edge.to);
          if (!from || !to) return null;
          const restricted = (network.restrictions || []).some(
            (restriction) => restriction.enabled && restriction.sumoEdgeId === edge.id
          );
          const onRoute = routeEdges.has(edge.id);
          return (
            <g key={edge.id}>
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={restricted ? '#dc2626' : onRoute ? '#2563eb' : '#94a3b8'}
                strokeWidth={onRoute ? 16 : 9}
                strokeDasharray={restricted ? '16 10' : undefined}
                strokeLinecap="round"
              />
              <text
                x={(from.x + to.x) / 2}
                y={(from.y + to.y) / 2 - 18}
                textAnchor="middle"
                fontSize="18"
                fill={restricted ? '#991b1b' : '#334155'}
              >
                {edge.id}{restricted ? ' · BLOCKED' : ''}
              </text>
            </g>
          );
        })}
        {(network.nodes || []).map((node) => (
          <g key={node.id}>
            <circle cx={node.x} cy={node.y} r="8" fill="#334155" />
            <text x={node.x} y={node.y + 28} textAnchor="middle" fontSize="16" fill="#334155">
              {node.id}
            </text>
          </g>
        ))}
        {run?.position && (
          <g>
            <circle cx={run.position.x} cy={run.position.y} r="15" fill="#f97316" stroke="white" strokeWidth="4" />
            <text x={run.position.x} y={run.position.y - 24} textAnchor="middle" fontSize="18" fill="#9a3412">
              {run.vehicleId}
            </text>
          </g>
        )}
      </svg>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span><span className="mr-1 inline-block h-2 w-5 rounded bg-blue-600" />Selected SUMO route</span>
        <span><span className="mr-1 inline-block h-2 w-5 rounded bg-red-600" />Synthetic restriction</span>
        <span><span className="mr-1 inline-block h-3 w-3 rounded-full bg-orange-500" />Simulated ambulance</span>
      </div>
    </div>
  );
}

export default function SimulationPage() {
  const { missionId } = useParams();
  const [mission, setMission] = useState(null);
  const [run, setRun] = useState(null);
  const [network, setNetwork] = useState(null);
  const [connection, setConnection] = useState('disconnected');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [events, setEvents] = useState([]);

  const refresh = useCallback(async () => {
    try {
      const [missionData, runData, configData] = await Promise.all([
        getMission(missionId),
        getSimulationRun(missionId),
        getSimulationConfig(),
      ]);
      setMission(missionData);
      setRun(runData);
      setNetwork(configData);
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Could not load simulation state.');
    } finally {
      setLoading(false);
    }
  }, [missionId]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [missionData, runData, configData] = await Promise.all([
          getMission(missionId),
          getSimulationRun(missionId),
          getSimulationConfig(),
        ]);
        if (!active) return;
        setMission(missionData);
        setRun(runData);
        setNetwork(configData);
        setError('');
      } catch (loadError) {
        if (active) setError(loadError.message || 'Could not load simulation state.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    void initSocket();

    const unsubscribeStatus = onStatus(setConnection);
    const unsubscribeUpdate = subscribeEvent('simulation:update', (update) => {
      if (String(update.missionId) !== missionId || !active) return;
      setRun(update);
      setEvents((current) => [
        {
          id: `${update.runId}-${update.lastSequence}-${Date.now()}`,
          status: update.status,
          edge: update.currentEdgeId,
          conflict: update.conflictState,
          time: update.lastUpdateAt || new Date().toISOString(),
        },
        ...current,
      ].slice(0, 30));
      setError('');
    });
    const pollTimer = window.setInterval(() => {
      if (connection !== 'connected') void refresh();
    }, 3000);
    const clockTimer = window.setInterval(() => setNow(Date.now()), 1000);

    return () => {
      active = false;
      unsubscribeStatus();
      unsubscribeUpdate();
      window.clearInterval(pollTimer);
      window.clearInterval(clockTimer);
    };
  }, [missionId, connection, refresh]);

  const lastUpdate = run?.lastUpdateAt ? new Date(run.lastUpdateAt).getTime() : 0;
  const isStale = run?.status === 'RUNNING' && (!lastUpdate || now - lastUpdate > STALE_AFTER_MS);
  const position = run?.position;

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 pb-12 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/" className="mb-2 inline-flex items-center gap-2 text-sm text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to dashboard
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Mission Simulation</h1>
          <p className="text-sm text-muted-foreground">Mission {missionId}</p>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh
        </button>
      </div>

      <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
        <strong>Synthetic SUMO demo only.</strong> Road geometry, traffic, restrictions, ambulance movement, and coordinates are generated for this demo.
        No real TomTom traffic, GPS feed, or physical traffic-signal controller is connected.
      </div>

      {connection !== 'connected' && (
        <div role="status" className="rounded-md border bg-muted px-4 py-3 text-sm">
          Realtime socket is {connection}; REST polling is used as a fallback.
        </div>
      )}
      {isStale && (
        <div role="status" className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Simulation telemetry is stale: no update received for at least 15 seconds.
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {loading && <p role="status" className="text-sm text-muted-foreground">Loading mission and simulation state...</p>}

      {run && (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground">Run status</p>
              <p className="mt-1 font-semibold">{run.status}</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground">Vehicle / severity</p>
              <p className="mt-1 font-semibold">{run.vehicleId} / {mission?.severity ?? '—'}</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground">Current edge / speed</p>
              <p className="mt-1 font-semibold">{run.currentEdgeId || 'Waiting for vehicle'} / {run.speedKmh == null ? '—' : `${run.speedKmh.toFixed(1)} km/h`}</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground">Position (SUMO-local, not GPS)</p>
              <p className="mt-1 font-semibold">{position ? `${position.x.toFixed(0)} m, ${position.y.toFixed(0)} m` : 'Not available yet'}</p>
            </div>
          </section>

          <section className="space-y-4 rounded-lg border bg-card p-4">
            <div>
              <h2 className="font-semibold">Synthetic corridor and route</h2>
              <p className="text-xs text-muted-foreground">
                Fixed destination: {run.destinationEdgeId} · Source: {run.source}
              </p>
            </div>
            <SimulationMap run={run} network={network} />
            <div className="space-y-2 text-sm">
              <p><strong>Current route:</strong> {(run.route || []).join(' → ') || 'Waiting for route'}</p>
              <p><strong>Route decision:</strong> {run.rerouteReason || 'No alternate route was required.'}</p>
              {mission?.simulationConfig?.originEdgeId && (
                <p><strong>Configured origin:</strong> {mission.simulationConfig.originEdgeId}</p>
              )}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border bg-card p-4">
              <h2 className="mb-3 font-semibold">Synthetic traffic and restrictions</h2>
              <div className="max-h-64 space-y-2 overflow-auto text-sm">
                {(run.traffic || []).map((item) => (
                  <div key={item.sumoEdgeId} className="flex justify-between gap-3 border-b pb-2">
                    <span>{item.sumoEdgeId}</span>
                    <span>{item.status} · {item.averageSpeedKmh?.toFixed(1)} km/h</span>
                  </div>
                ))}
                {!run.traffic?.length && <p className="text-muted-foreground">Traffic observations are unavailable.</p>}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Traffic source: SYNTHETIC_DEMO, generated by the local scenario.</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <h2 className="mb-3 font-semibold">Signals and conflict management</h2>
              <p className="text-sm">
                {run.signalState
                  ? JSON.stringify(run.signalState)
                  : 'No SUMO signal observation is configured. This simulation does not control physical signals.'}
              </p>
              {run.conflictState && (
                <div className="mt-3 rounded-md border p-3 text-sm">
                  <strong>{run.conflictState.status}</strong> at {run.conflictState.intersectionNodeId}
                  <p>{run.conflictState.reason}</p>
                  {run.conflictState.priorityVehicleId && <p>Priority vehicle: {run.conflictState.priorityVehicleId}</p>}
                </div>
              )}
            </div>
          </section>

          {run.error && (
            <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {run.error}
            </div>
          )}
          <section className="rounded-lg border bg-card p-4">
            <h2 className="mb-3 font-semibold">Simulation event log</h2>
            <div className="max-h-48 space-y-2 overflow-auto text-xs">
              {events.map((event) => (
                <p key={event.id} className="border-b pb-2">
                  {new Date(event.time).toLocaleTimeString()} · {event.status}
                  {event.edge && ` · ${event.edge}`}
                  {event.conflict && ` · conflict ${event.conflict.status} at ${event.conflict.intersectionNodeId}`}
                </p>
              ))}
              {events.length === 0 && (
                <p className="text-muted-foreground">
                  {run.status === 'RUNNING' ? 'Waiting for realtime events…' : `No new events. Run ${run.status.toLowerCase()}.`}
                </p>
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
