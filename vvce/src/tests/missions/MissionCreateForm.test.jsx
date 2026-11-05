/**
 * @file MissionCreateForm.test.jsx
 * @description Unit tests for MissionCreateForm component.
 */
import React from 'react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MissionCreateForm } from '../../components/domain/missions/MissionCreateForm.jsx';

describe('MissionCreateForm', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders correctly and submits valid data', async () => {
    const handleSubmit = vi.fn().mockResolvedValue({});
    vi.stubGlobal('fetch', vi.fn((url) => Promise.resolve({
      ok: true,
      json: async () => url === '/api/simulations/config'
        ? { data: { mode: 'DEMO', edges: [{ id: 'S1_S2' }, { id: 'S3_S4' }] } }
        : { data: [{ vehicleId: 'AMB-999', driverName: 'Demo Driver', vehicleNumber: 'ABC123' }] },
    })));
    render(<MissionCreateForm onSubmit={handleSubmit} loading={false} />);

    const input = screen.getByPlaceholderText('e.g. AMB-707');
    fireEvent.change(input, { target: { value: 'AMB-999' } });
    const originSelect = screen.getByLabelText('Synthetic origin edge');
    const destinationSelect = screen.getByLabelText('Synthetic destination edge');
    await waitFor(() => expect(originSelect.querySelector('option[value="S1_S2"]')).toBeInTheDocument());
    fireEvent.change(originSelect, { target: { value: 'S1_S2' } });
    fireEvent.change(destinationSelect, { target: { value: 'S3_S4' } });

    const submitBtn = screen.getByRole('button', { name: /create mission/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          vehicleId: 'AMB-999',
          severity: 3,
          simulationConfig: {
            mode: 'DEMO',
            vehicleSource: 'REGISTERED',
            originEdgeId: 'S1_S2',
            destinationEdgeId: 'S3_S4',
          },
        })
      );
    });
  });

  it('shows validation error when vehicleId is empty', async () => {
    const handleSubmit = vi.fn();
    render(<MissionCreateForm onSubmit={handleSubmit} loading={false} />);

    const submitBtn = screen.getByRole('button', { name: /create mission/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText(/vehicle id is required/i)).toBeInTheDocument();
    expect(handleSubmit).not.toHaveBeenCalled();
  });
});