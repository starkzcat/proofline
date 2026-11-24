import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from '../src/pages/Login.js';
import * as AuthContextModule from '../src/context/AuthContext.js';
import { Role } from '@proofline/shared';

describe('LoginPage', () => {
  it('renders form inputs and demo account buttons', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      demoSwitch: vi.fn(),
      refetchUser: vi.fn(),
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Admin' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Marketer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Client' })).toBeInTheDocument();
  });

  it('triggers demo switch on clicking demo account button', async () => {
    const mockDemoSwitch = vi.fn().mockResolvedValue({
      id: 'demo-admin',
      email: 'admin@proofline.dev',
      name: 'Admin User',
      role: Role.ADMIN,
      createdAt: new Date().toISOString(),
    });

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      demoSwitch: mockDemoSwitch,
      refetchUser: vi.fn(),
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Admin' }));

    await waitFor(() => {
      expect(mockDemoSwitch).toHaveBeenCalledWith(Role.ADMIN);
    });
  });
});
