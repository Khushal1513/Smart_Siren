/**
 * @file MissionActions.test.jsx
 * @description Unit tests for MissionActions component button enabling/disabling rules.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

  it('deletes the selected mission after confirmation', async () => {
    const deleteMission = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const mission = { _id: '1', vehicleId: 'AMB-1', status: 'CREATED' };

    render(
      <MissionActions
        mission={mission}
        actions={{ deleteMission }}
        loading={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /delete mission/i }));

    await waitFor(() => expect(deleteMission).toHaveBeenCalledWith('1'));
    expect(window.confirm).toHaveBeenCalledWith('Permanently delete the mission for AMB-1?');
    vi.restoreAllMocks();
  });
});