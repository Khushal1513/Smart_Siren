/**
 * @file MissionCreateForm.jsx
 * @description Form to create a new emergency mission with vehicleId, severity, and dynamic route signals.
 */
import React, { useEffect, useState } from 'react';

/**
 * MissionCreateForm component.
 * @param {Object} props
 * @param {Function} props.onSubmit - Submit handler
 * @param {boolean} props.loading - Loading state
 * @param {Object} [props.externalError] - External error object
 */
export function MissionCreateForm({ onSubmit, loading, externalError }) {
  const [vehicleId, setVehicleId] = useState('');
  const [severity, setSeverity] = useState(3);
  const [route, setRoute] = useState([{ signalId: '', distanceAlongRouteM: 0 }]);
  const [validationError, setValidationError] = useState(null);
  const [simulationConfig, setSimulationConfig] = useState(null);
  const [registeredVehicles, setRegisteredVehicles] = useState([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/simulations/config').then(async (response) => {
        const body = await response.json();
        if (!response.ok || !body.data) throw new Error(body.error || 'Could not load simulation configuration.');
        return body.data;
      })
      .then((demoConfig) => {
        if (active) setSimulationConfig(demoConfig);
      })
      .catch((error) => {
        if (active) setLoadError(error.message);
      });
    fetch('/api/vehicles?limit=200').then(async (response) => {
        const body = await response.json();
        if (!response.ok || !Array.isArray(body.data)) throw new Error(body.message || 'Could not load registered vehicles.');
        return body.data;
      })
      .then((vehicles) => {
        if (!active) return;
        setRegisteredVehicles(vehicles);
      })
      .catch((error) => {
        if (active) setLoadError((current) => current ? `${current} ${error.message}` : error.message);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleAddRouteRow = () => {
    setRoute([...route, { signalId: '', distanceAlongRouteM: (route.length + 1) * 200 }]);
  };

  const handleRemoveRouteRow = (index) => {
    setRoute(route.filter((_, i) => i !== index));
  };

  const handleRouteFieldChange = (index, field, value) => {
    const updated = [...route];
    updated[index][field] = field === 'distanceAlongRouteM' ? Number(value) : value;
    setRoute(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vehicleId.trim()) {
      setValidationError('Vehicle ID is required.');
      return;
    }
    if (vehicleId.length > 64) {
      setValidationError('Vehicle ID must be at most 64 characters.');
      return;
    }
    if (!simulationConfig) {
      setValidationError(loadError || 'Synthetic simulation configuration is unavailable.');
      return;
    }
    if (!simulationConfig.originEdgeId || !simulationConfig.destinationEdgeId) {
      setValidationError('Choose both a synthetic simulation origin and destination edge.');
      return;
    }
    setValidationError(null);

    const formattedRoute = route
      .filter((r) => r.signalId.trim() !== '')
      .map((r) => ({ signalId: r.signalId.trim(), distanceAlongRouteM: Number(r.distanceAlongRouteM) }));

    try {
      await onSubmit({
        vehicleId: vehicleId.trim(),
        severity: Number(severity),
        route: formattedRoute,
        simulationConfig: {
          mode: 'DEMO',
          originEdgeId: simulationConfig.originEdgeId,
          destinationEdgeId: simulationConfig.destinationEdgeId,
        },
      });
      setVehicleId('');
      setSeverity(3);
      setRoute([{ signalId: '', distanceAlongRouteM: 0 }]);
      setSimulationConfig((current) => current && {
        ...current,
        originEdgeId: '',
        destinationEdgeId: '',
      });
    } catch {
      // The parent displays the action error.
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-card p-4 rounded-lg border shadow-sm">
      <h3 className="text-lg font-medium text-foreground">Create New Emergency Mission</h3>

      {(validationError || externalError) && (
        <div aria-live="polite" className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
          <p className="font-semibold">Validation Error</p>
          <p>{validationError || externalError?.message}</p>
          {externalError?.details?.length > 0 && (
            <ul className="list-disc list-inside mt-1">
              {externalError.details.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Registered Vehicle ID *</label>
          <input
            type="text"
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            placeholder="e.g. AMB-707"
            maxLength={64}
            list="registered-vehicle-ids"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <datalist id="registered-vehicle-ids">
            {registeredVehicles.map((vehicle) => (
              <option key={vehicle.vehicleId} value={vehicle.vehicleId}>
                {vehicle.driverName} · {vehicle.vehicleNumber}
              </option>
            ))}
          </datalist>
          <p className="mt-1 text-xs text-muted-foreground">
            Use the vehicleId generated by registration, not its plate number.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Severity (1-5)</label>
          <select
            value={severity}
            onChange={(e) => setSeverity(Number(e.target.value))}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value={1}>1 - Low</option>
            <option value={2}>2 - Moderate</option>
            <option value={3}>3 - Urgent</option>
            <option value={4}>4 - Critical</option>
            <option value={5}>5 - Maximum</option>
          </select>
        </div>
      </div>

      <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3">
        <div>
          <h4 className="text-sm font-semibold text-amber-950">Synthetic SUMO demo route</h4>
          <p className="text-xs text-amber-900">
            These local corridor edges are not real roads or GPS locations. Live traffic and physical signal control are not connected.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-xs font-medium text-amber-950">
            Origin edge
            <select
              aria-label="Synthetic origin edge"
              value={simulationConfig?.originEdgeId || ''}
              onChange={(event) => setSimulationConfig((current) => ({ ...current, originEdgeId: event.target.value }))}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="">Select origin edge</option>
              {(simulationConfig?.edges || []).map((edge) => (
                <option key={edge.id} value={edge.id}>{edge.id} (synthetic)</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-amber-950">
            Fixed destination edge
            <select
              aria-label="Synthetic destination edge"
              value={simulationConfig?.destinationEdgeId || ''}
              onChange={(event) => setSimulationConfig((current) => ({ ...current, destinationEdgeId: event.target.value }))}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="">Select destination edge</option>
              {(simulationConfig?.edges || []).map((edge) => (
                <option key={edge.id} value={edge.id}>{edge.id} (synthetic)</option>
              ))}
            </select>
          </label>
        </div>
        {loadError && <p role="alert" className="text-xs text-destructive">{loadError}</p>}
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium text-foreground">Route Signal Preemption Points</label>
          <button
            type="button"
            onClick={handleAddRouteRow}
            className="text-xs bg-secondary text-secondary-foreground hover:bg-accent px-2.5 py-1 rounded-md font-medium"
          >
            + Add Signal
          </button>
        </div>
        <div className="space-y-2">
          {route.map((item, index) => (
            <div key={index} className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="Signal ID (e.g. SIG-01)"
                value={item.signalId}
                onChange={(e) => handleRouteFieldChange(index, 'signalId', e.target.value)}
                className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground"
              />
              <input
                type="number"
                placeholder="Distance (m)"
                value={item.distanceAlongRouteM}
                onChange={(e) => handleRouteFieldChange(index, 'distanceAlongRouteM', e.target.value)}
                className="w-32 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground"
              />
              {route.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveRouteRow(index)}
                  className="text-destructive hover:text-destructive/80 text-sm font-bold px-2 py-1"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-2 px-4 rounded-md font-medium text-sm transition-colors disabled:opacity-50"
      >
        {loading ? 'Creating Mission...' : 'Create Mission'}
      </button>
    </form>
  );
}