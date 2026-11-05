import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const getStatusClass = (status) => {
  switch (status?.toLowerCase()) {
    case 'green':
      return 'signal-status-green';
    case 'yellow':
      return 'signal-status-yellow';
    case 'red':
      return 'signal-status-red';
    default:
      return 'rounded-full border px-3 py-1 text-xs font-medium capitalize';
  }
};

export const TrafficSignalsList = () => {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSignals = useCallback(async (isMounted) => {
    try {
      const response = await fetch('/api/traffic-signals');
      if (!response.ok) {
        throw new Error(`Failed to load traffic signals (HTTP ${response.status}).`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('The traffic signal API returned an invalid response.');
      }

      if (isMounted()) {
        setSignals(data);
        setError('');
      }
    } catch (loadError) {
      if (isMounted()) {
        setError(loadError.message || 'Failed to load traffic signals.');
      }
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const isMounted = () => active;
    loadSignals(isMounted);

    const refreshTimer = window.setInterval(() => loadSignals(isMounted), 10000);
    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, [loadSignals]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Traffic Signal Control</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {loading && signals.length === 0 ? (
            <p className="text-sm text-muted-foreground">Loading traffic signals...</p>
          ) : error && signals.length === 0 ? (
            <p role="alert" className="text-sm text-destructive">{error}</p>
          ) : signals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No traffic signals have been registered.</p>
          ) : (
            <>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              {signals.map((signal) => (
                <div
                  key={signal._id || signal.signalId}
                  className="flex items-center justify-between gap-3 border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium">
                        {signal.location || [signal.intersection, signal.area, signal.city].filter(Boolean).join(', ') || 'Location unavailable'}
                      </span>
                      <span className={getStatusClass(signal.status)}>
                        {(signal.status || 'unknown').toUpperCase()}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Signal ID: {signal.signalId || 'Unavailable'}
                      {signal.signalType ? ` · ${signal.signalType}` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
