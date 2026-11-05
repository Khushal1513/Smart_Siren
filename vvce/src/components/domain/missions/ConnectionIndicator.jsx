/**
 * @file ConnectionIndicator.jsx
 * @description Status dot and label for connection status.
 */
import React from 'react';

const STATUS_CONFIG = {
  connected: { color: 'bg-green-500', label: 'Connected' },
  disconnected: { color: 'bg-red-500', label: 'Disconnected' },
  polling: { color: 'bg-amber-500', label: 'Polling Fallback' },
};

/**
 * ConnectionIndicator component.
 * @param {Object} props
 * @param {string} props.status - Connection status
 */
export function ConnectionIndicator({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.disconnected;
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary border text-xs font-medium text-foreground">
      <span className={`w-2.5 h-2.5 rounded-full ${cfg.color} animate-pulse`} />
      <span>{cfg.label}</span>
    </div>
  );
}