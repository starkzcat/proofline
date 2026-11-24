import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AppShell } from '../src/components/layout/AppShell.js';
import { DemoRoleSwitcher } from '../src/components/layout/DemoRoleSwitcher.js';
import * as AuthContextModule from '../src/context/AuthContext.js';
import { Role } from '@proofline/shared';

describe('DemoRoleSwitcher', () => {
  it('renders all three roles and calls demoSwitch when clicked', async () => {
    const mockDemoSwitch = vi.fn().mockResolvedValue({
      id: 'user-2',
      email: 'client@proofline.dev',
      name: 'Client User',
      role: Role.CLIENT,
      createdAt: new Date().toISOString(),
    });

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 'user-1',
        email: 'admin@proofline.dev',
        name: 'Admin User',
        role: Role.ADMIN,
        createdAt: new Date().toISOString(),
      },
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      demoSwitch: mockDemoSwitch,
      refetchUser: vi.fn(),
    });

    render(<DemoRoleSwitcher />);

    const clientBtn = screen.getByRole('button', { name: 'Client' });
    expect(clientBtn).toBeInTheDocument();

    fireEvent.click(clientBtn);

    await waitFor(() => {
      expect(mockDemoSwitch).toHaveBeenCalledWith(Role.CLIENT);
    });
  });
});

describe('AppShell', () => {
  it('renders brand, navigation links, and hides Audit Log for non-admins', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 'user-2',
        email: 'client@proofline.dev',
        name: 'Client User',
        role: Role.CLIENT,
        createdAt: new Date().toISOString(),
      },
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      demoSwitch: vi.fn(),
      refetchUser: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/campaigns']}>
        <AppShell>
          <div data-testid="page-content">Page Content</div>
        </AppShell>
      </MemoryRouter>
    );

    expect(screen.getAllByText('Proofline').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Campaigns')).toBeInTheDocument();
    expect(screen.getByText('Pending Review')).toBeInTheDocument();
    expect(screen.queryByText('Audit Log')).not.toBeInTheDocument();
    expect(screen.getByTestId('page-content')).toBeInTheDocument();
  });

  it('renders Audit Log navigation link for admin users', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 'user-1',
        email: 'admin@proofline.dev',
        name: 'Admin User',
        role: Role.ADMIN,
        createdAt: new Date().toISOString(),
      },
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      demoSwitch: vi.fn(),
      refetchUser: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/campaigns']}>
        <AppShell>
          <div>Admin Content</div>
        </AppShell>
      </MemoryRouter>
    );

    expect(screen.getByText('Audit Log')).toBeInTheDocument();
  });
});
