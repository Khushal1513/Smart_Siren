/**
 * @file MissionCreateForm.jsx
 * @description Form to create a new emergency mission with vehicleId, severity, and dynamic route signals.
 */
import React, { useState } from 'react';

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
    setValidationError(null);

    const formattedRoute = route
      .filter((r) => r.signalId.trim() !== '')
      .map((r) => ({ signalId: r.signalId.trim(), distanceAlongRouteM: Number(r.distanceAlongRouteM) }));

    try {
      await onSubmit({
        vehicleId: vehicleId.trim(),
        severity: Number(severity),
        route: formattedRoute,
      });
      setVehicleId('');
      setSeverity(3);
      setRoute([{ signalId: '', distanceAlongRouteM: 0 }]);
    } catch (err) {
      // Handled by parent error state
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
          <label className="block text-sm font-medium text-foreground mb-1">Vehicle ID *</label>
          <input
            type="text"
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            placeholder="e.g. AMB-707"
            maxLength={64}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
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