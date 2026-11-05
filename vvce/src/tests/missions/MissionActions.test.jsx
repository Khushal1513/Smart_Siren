/**
 * @file MissionActions.test.jsx
 * @description Unit tests for MissionActions component button enabling/disabling rules.
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MissionActions } from '../../components/domain/missions/MissionActions.jsx';

describe('MissionActions', () => {
  it('enables Activate and Abort when status is CREATED', () => {
    const mission = { _id: '1', vehicleId: 'AMB-1', status: 'CREATED' };
    const actions = {};

    render(<MissionActions mission={mission} actions={actions} loading={false} />);

    expect(screen.getByRole('button', { name: /^activate$/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /^abort$/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /mark arrived/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^close$/i })).toBeDisabled();
  });

  it('enables Mark Arrived and Abort when status is ACTIVE', () => {
    const mission = { _id: '1', vehicleId: 'AMB-1', status: 'ACTIVE' };
    const actions = {};

    render(<MissionActions mission={mission} actions={actions} loading={false} />);

    expect(screen.getByRole('button', { name: /^activate$/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /mark arrived/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /^abort$/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /^close$/i })).toBeDisabled();
  });
});