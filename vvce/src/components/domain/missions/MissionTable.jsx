/**
 * @file MissionTable.jsx
 * @description Sortable table displaying missions with status filter and selection.
 */
import React, { useState } from 'react';
import { MissionStatusBadge } from './MissionStatusBadge.jsx';

/**
 * MissionTable component.
 * @param {Object} props
 * @param {Array} props.missions - List of missions
 * @param {string} props.selectedId - Currently selected mission ID
 * @param {Function} props.onSelect - Selection handler
 * @param {string} props.filterStatus - Current status filter
 * @param {Function} props.onFilterChange - Filter change handler
 * @param {boolean} props.loading - Loading flag
 */
export function MissionTable({ missions, selectedId, onSelect, filterStatus, onFilterChange, loading }) {
  const [sortOrder, setSortOrder] = useState('desc');

  const sortedMissions = [...missions].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
  });

  return (
    <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
      <div className="p-4 border-b flex flex-wrap justify-between items-center gap-4">
        <h3 className="text-lg font-medium text-foreground">Missions Console</h3>
        <div className="flex items-center gap-3">
          <select
            value={filterStatus}
            onChange={(e) => onFilterChange(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground"
          >
            <option value="">All Statuses</option>
            <option value="CREATED">CREATED</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="ARRIVED">ARRIVED</option>
            <option value="CLOSED">CLOSED</option>
            <option value="ABORTED">ABORTED</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="text-xs bg-secondary text-secondary-foreground hover:bg-accent px-3 py-1.5 rounded-md font-medium"
          >
            Sort: {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-muted-foreground uppercase text-xs">
            <tr>
              <th className="px-4 py-3">Vehicle ID</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">ETA (P50/P90)</th>
              <th className="px-4 py-3">Created At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && missions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Loading missions...
                </td>
              </tr>
            ) : sortedMissions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No missions found.
                </td>
              </tr>
            ) : (
              sortedMissions.map((m) => {
                const isSelected = m._id === selectedId;
                return (
                  <tr
                    key={m._id}
                    onClick={() => onSelect(m._id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-accent font-semibold' : 'hover:bg-accent/50'
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-foreground">{m.vehicleId}</td>
                    <td className="px-4 py-3">
                      <MissionStatusBadge status={m.status} />
                    </td>
                    <td className="px-4 py-3">{m.severity || 3}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {m.etaP50}s / {m.etaP90}s
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(m.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}