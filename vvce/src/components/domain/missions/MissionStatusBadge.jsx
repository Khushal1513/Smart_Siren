/**
 * @file MissionStatusBadge.jsx
 * @description Color-coded badge for mission status values.
 */
import React from 'react';

const STATUS_CLASSES = {
  CREATED: 'bg-blue-100 text-blue-800 border-blue-200',
  ACTIVE: 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse',
  ARRIVED: 'bg-teal-100 text-teal-800 border-teal-200',
  CLOSED: 'bg-gray-100 text-gray-700 border-gray-200',
  ABORTED: 'bg-red-100 text-red-800 border-red-200',
};

/**
 * MissionStatusBadge component.
 * @param {Object} props
 * @param {string} props.status - Mission status
 */
export function MissionStatusBadge({ status }) {
  const cls = STATUS_CLASSES[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {status || 'UNKNOWN'}
    </span>
  );
}