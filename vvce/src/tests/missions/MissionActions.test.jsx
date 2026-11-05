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

  it('only reports activation after the backend confirms a started run', async () => {
    const activateMission = vi.fn().mockResolvedValue({
      mission: { _id: '1', vehicleId: 'AMB-1', status: 'ACTIVE' },
      simulation: { status: 'RUNNING', runId: 'run-1' },
    });
    const onActivated = vi.fn();
    render(
      <MissionActions
        mission={{ _id: '1', vehicleId: 'AMB-1', status: 'CREATED' }}
        actions={{ activateMission }}
        loading={false}
        onActivated={onActivated}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /^activate$/i }));
    await waitFor(() => expect(onActivated).toHaveBeenCalledWith(
      expect.objectContaining({ simulation: expect.objectContaining({ status: 'RUNNING' }) })
    ));
  });

  it('does not report activation when backend activation or simulation startup fails', async () => {
    const activateMission = vi.fn().mockRejectedValue(new Error('SUMO unavailable'));
    const onActivated = vi.fn();
    render(
      <MissionActions
        mission={{ _id: '1', vehicleId: 'AMB-1', status: 'CREATED' }}
        actions={{ activateMission }}
        loading={false}
        onActivated={onActivated}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /^activate$/i }));
    await waitFor(() => expect(activateMission).toHaveBeenCalledOnce());
    expect(onActivated).not.toHaveBeenCalled();
  });
});