import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Play, RefreshCw } from 'lucide-react';
import {
  getArrivedMissionReplays,
  getSimulationConfig,
  replayArrivedMissions,
} from '../services/simulationApi.js';
import { initSocket, onStatus, subscribeEvent } from '../services/socketClient.js';

const colors = ['#ea580c', '#7c3aed', '#0891b2', '#16a34a', '#db2777', '#ca8a04'];

function LiveMap({ runs, network }) {
  const nodes = useMemo(() => new Map((network?.nodes || []).map((node) => [node.id, node])), [network]);
  if (!network?.edges?.length) {
    return <p className="p-6 text-sm text-muted-foreground">Synthetic corridor map is unavailable.</p>;
  }
  const maxX = Math.max(1200, ...network.nodes.map((node) => node.x));
  const maxY = Math.max(300, ...network.nodes.map((node) => node.y));

  return (
    <svg
      role="img"
      aria-label="Live synthetic SUMO replay map"
      viewBox={`-50 -50 ${maxX + 100} ${maxY + 100}`}
      className="h-80 w-full rounded-md bg-slate-50"
    >
      {network.edges.map((edge) => {
        const from = nodes.get(edge.from);
        const to = nodes.get(edge.to);
        if (!from || !to) return null;
        const blocked = (network.restrictions || []).some(
          (restriction) => restriction.enabled && restriction.sumoEdgeId === edge.id
        );
        return (
          <g key={edge.id}>
            <line
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={blocked ? '#dc2626' : '#94a3b8'}
              strokeWidth="10"
              strokeDasharray={blocked ? '14 9' : undefined}
              strokeLinecap="round"
            />
            <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 16} textAnchor="middle" fontSize="18">
              {edge.id}{blocked ? ' · BLOCKED' : ''}
            </text>
          </g>
        );
      })}
      {runs.map((run, runIndex) => (run.route || []).map((edgeId) => {
        const edge = network.edges.find((item) => item.id === edgeId);
        const from = edge && nodes.get(edge.from);
        const to = edge && nodes.get(edge.to);
        if (!from || !to) return null;
        return (
          <line
            key={`${run.runId}-${edgeId}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={colors[runIndex % colors.length]}
            strokeWidth="5"
            strokeLinecap="round"
          />
        );
      }))}
      {network.nodes.map((node) => (
        <g key={node.id}>
          <circle cx={node.x} cy={node.y} r="7" fill="#334155" />
          <text x={node.x} y={node.y + 24} textAnchor="middle" fontSize="16">{node.id}</text>
        </g>
      ))}
      {runs.map((run, index) => run.position && (
        <g key={run.runId}>
          <circle cx={run.position.x} cy={run.position.y} r="14" fill={colors[index % colors.length]} stroke="white" strokeWidth="4" />
          <text x={run.position.x} y={run.position.y - 22} textAnchor="middle" fontSize="17" fill="#0f172a">
            {run.vehicleId}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function LiveSimulationPage() {
  const [runs, setRuns] = useState([]);
  const [network, setNetwork] = useState(null);
  const [connection, setConnection] = useState('disconnected');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [replaying, setReplaying] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [replayData, configData] = await Promise.all([
        getArrivedMissionReplays(),
        getSimulationConfig(),
      ]);
      setRuns(replayData);
      setNetwork(configData);
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Could not load simulation replays.');
    } finally {
      setLoading(false);
    }
  }, []);

  const startReplay = async () => {
    setReplaying(true);
    try {
      const replayRuns = await replayArrivedMissions();
      setRuns((current) => {
        const merged = new Map(current.map((run) => [run.runId, run]));
        replayRuns.forEach((run) => merged.set(run.runId, run));
        return [...merged.values()].sort((first, second) => (
          new Date(second.createdAt) - new Date(first.createdAt)
        ));
      });
      setError('');
    } catch (replayError) {
      setError(replayError.message || 'Could not replay ARRIVED missions.');
    } finally {
      setReplaying(false);
    }
  };

  useEffect(() => {
    let active = true;
    void refresh();
    void initSocket();
    const unsubscribeStatus = onStatus(setConnection);
    const unsubscribeUpdate = subscribeEvent('simulation:update', (update) => {
      if (!active || !update.sourceMissionId) return;
      setRuns((current) => {
        const index = current.findIndex((run) => run.runId === update.runId);
        if (index < 0) return [update, ...current];
        const next = [...current];
        next[index] = update;
        return next;
      });
    });
    const timer = window.setInterval(() => {
      if (connection !== 'connected') void refresh();
    }, 3000);
    return () => {
      active = false;
      unsubscribeStatus();
      unsubscribeUpdate();
      window.clearInterval(timer);
    };
  }, [connection, refresh]);

  const runningCount = runs.filter((run) => ['STARTING', 'RUNNING'].includes(run.status)).length;

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 pb-12 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/missions" className="mb-2 inline-flex items-center gap-2 text-sm text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to missions
          </Link>
          <h1 className="text-2xl font-bold">Live Simulation</h1>
          <p className="text-sm text-muted-foreground">Synthetic SUMO replays from MongoDB missions marked ARRIVED.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={refresh} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent">
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh
          </button>
          <button
            type="button"
            onClick={startReplay}
            disabled={replaying || runningCount > 0}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            {replaying ? 'Starting…' : runningCount > 0 ? 'Simulation running' : 'Replay ARRIVED ambulances'}
          </button>
        </div>
      </header>

      <div role="note" className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
        <strong>Synthetic replay, not live ambulance tracking.</strong> Vehicle IDs, coordinates, road movement, and restrictions are simulated.
        The original ARRIVED mission records are not modified; rerouting uses the existing synthetic blocked-road algorithm.
      </div>
      {connection !== 'connected' && (
        <div role="status" className="rounded-md border bg-muted px-4 py-3 text-sm">
          Realtime connection is {connection}; the page polls the backend every 3 seconds.
        </div>
      )}
      {error && <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>}
      {loading && <p role="status" className="text-sm text-muted-foreground">Loading ARRIVED mission replays...</p>}

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-4"><p className="text-xs text-muted-foreground">Vehicles in scene</p><p className="mt-1 text-xl font-semibold">{runs.length}</p></div>
        <div className="rounded-lg border bg-card p-4"><p className="text-xs text-muted-foreground">Moving / starting</p><p className="mt-1 text-xl font-semibold">{runningCount}</p></div>
        <div className="rounded-lg border bg-card p-4"><p className="text-xs text-muted-foreground">Replay source</p><p className="mt-1 text-xl font-semibold">ARRIVED missions</p></div>
      </section>

      <section className="space-y-3 rounded-lg border bg-card p-4">
        <div>
          <h2 className="font-semibold">Synthetic corridor</h2>
          <p className="text-xs text-muted-foreground">Markers are SUMO-local positions in meters, not GPS.</p>
        </div>
        <LiveMap runs={runs} network={network} />
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Ambulance replay status</h2>
        {runs.length === 0 && !loading && (
          <p className="rounded-lg border p-4 text-sm text-muted-foreground">
            No replay runs found. Restart the backend to load ARRIVED missions, or use the replay button after missions are loaded.
          </p>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {runs.map((run) => (
            <article key={run.runId} className="space-y-2 rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{run.vehicleId}</h3>
                  <p className="text-xs text-muted-foreground">Source mission: {run.sourceMissionId}</p>
                </div>
                <span className="rounded-full border px-2 py-1 text-xs">{run.status}</span>
              </div>
              <p className="text-sm">Edge: {run.currentEdgeId || 'Waiting'} · Speed: {run.speedKmh == null ? '—' : `${run.speedKmh.toFixed(1)} km/h`}</p>
              <p className="text-sm">Route: {(run.route || []).join(' → ') || 'Route pending'}</p>
              <p className="text-sm">Reroute: {run.rerouteReason || 'No alternate route required.'}</p>
              {run.error && <p role="alert" className="text-sm text-destructive">{run.error}</p>}
              <p className="text-xs text-muted-foreground">
                Updated: {run.lastUpdateAt ? new Date(run.lastUpdateAt).toLocaleTimeString() : 'Not started'}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
