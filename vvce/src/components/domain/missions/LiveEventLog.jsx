/**
 * @file LiveEventLog.jsx
 * @description Reverse chronological live event stream log with filter and clear button.
 */
import React, { useState } from 'react';

/**
 * LiveEventLog component.
 * @param {Object} props
 * @param {Array} props.events - List of event objects
 * @param {Function} props.onClear - Clear handler
 */
export function LiveEventLog({ events, onClear }) {
  const [filterEvent, setFilterEvent] = useState('');

  const filteredEvents = filterEvent
    ? events.filter((ev) => ev.event.toLowerCase().includes(filterEvent.toLowerCase()))
    : events;

  return (
    <div className="bg-card p-4 rounded-lg border shadow-sm space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-foreground">Live Event Log</h3>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Filter event..."
            value={filterEvent}
            onChange={(e) => setFilterEvent(e.target.value)}
            className="rounded-md border border-input bg-background px-2.5 py-1 text-xs text-foreground"
          />
          <button
            onClick={onClear}
            className="text-xs bg-secondary text-secondary-foreground hover:bg-accent px-3 py-1 rounded-md font-medium"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="h-48 overflow-y-auto bg-muted p-3 rounded-md font-mono text-xs space-y-2">
        {filteredEvents.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No real-time events recorded yet.</p>
        ) : (
          filteredEvents.map((ev) => (
            <div key={ev.id} className="border-b border-border pb-1">
              <div className="flex justify-between text-muted-foreground font-semibold">
                <span className="text-primary">{ev.event}</span>
                <span>{ev.timestamp}</span>
              </div>
              <pre className="text-foreground overflow-x-auto mt-0.5">{JSON.stringify(ev.payload)}</pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
}