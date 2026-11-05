/**
 * @file MissionCreateForm.test.jsx
 * @description Unit tests for MissionCreateForm component.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MissionCreateForm } from '../../components/domain/missions/MissionCreateForm.jsx';

describe('MissionCreateForm', () => {
  it('renders correctly and submits valid data', async () => {
    const handleSubmit = vi.fn().mockResolvedValue({});
    render(<MissionCreateForm onSubmit={handleSubmit} loading={false} />);

    const input = screen.getByPlaceholderText('e.g. AMB-707');
    fireEvent.change(input, { target: { value: 'AMB-999' } });

    const submitBtn = screen.getByRole('button', { name: /create mission/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ vehicleId: 'AMB-999', severity: 3 })
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