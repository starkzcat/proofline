import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AssetReviewPage } from '../src/pages/AssetReview.js';
import * as QueriesModule from '../src/api/queries.js';
import * as AuthContextModule from '../src/context/AuthContext.js';
import { AssetStatus, Role } from '@proofline/shared';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/assets/asset-1']}>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('AssetReviewPage RBAC & State UI', () => {
  const mockAsset = {
    id: 'asset-1',
    campaignId: 'camp-1',
    title: 'Hero Banner',
    description: 'Header creative',
    status: AssetStatus.IN_REVIEW,
    currentVersion: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    campaign: {
      id: 'camp-1',
      name: 'Holiday Launch',
      clientName: 'Client Corp',
    },
    versions: [
      {
        id: 'ver-2',
        assetId: 'asset-1',
        versionNumber: 2,
        fileName: 'hero_v2.png',
        fileKey: 'key2',
        fileUrl: 'https://example.com/hero_v2.png',
        mimeType: 'image/png',
        fileSizeBytes: 2048,
        changeNotes: 'Fixed CTA button contrast',
        createdAt: new Date().toISOString(),
        uploadedBy: {
          id: 'u-1',
          name: 'Marketer',
          email: 'marketer@proofline.dev',
          role: Role.MARKETER,
        },
        comments: [],
      },
      {
        id: 'ver-1',
        assetId: 'asset-1',
        versionNumber: 1,
        fileName: 'hero_v1.png',
        fileKey: 'key1',
        fileUrl: 'https://example.com/hero_v1.png',
        mimeType: 'image/png',
        fileSizeBytes: 1024,
        changeNotes: 'Initial upload',
        createdAt: new Date().toISOString(),
        uploadedBy: {
          id: 'u-1',
          name: 'Marketer',
          email: 'marketer@proofline.dev',
          role: Role.MARKETER,
        },
        comments: [],
      },
    ],
    auditLogs: [],
  };

  it('renders Approve and Request Changes buttons for CLIENT on IN_REVIEW asset', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 'user-client',
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

    vi.spyOn(QueriesModule, 'useAsset').mockReturnValue({
      data: { asset: mockAsset },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof QueriesModule.useAsset>);

    vi.spyOn(QueriesModule, 'useSubmitAsset').mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof QueriesModule.useSubmitAsset>);

    vi.spyOn(QueriesModule, 'useApproveAsset').mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof QueriesModule.useApproveAsset>);

    vi.spyOn(QueriesModule, 'useAddComment').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof QueriesModule.useAddComment>);

    renderWithProviders(<AssetReviewPage />);

    expect(screen.getByRole('button', { name: /Approve Asset/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Request Changes/i })).toBeInTheDocument();
  });

  it('hides Approve and Request Changes buttons for MARKETER on IN_REVIEW asset', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 'user-marketer',
        email: 'marketer@proofline.dev',
        name: 'Marketer User',
        role: Role.MARKETER,
        createdAt: new Date().toISOString(),
      },
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      demoSwitch: vi.fn(),
      refetchUser: vi.fn(),
    });

    vi.spyOn(QueriesModule, 'useAsset').mockReturnValue({
      data: { asset: mockAsset },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof QueriesModule.useAsset>);

    vi.spyOn(QueriesModule, 'useSubmitAsset').mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof QueriesModule.useSubmitAsset>);

    vi.spyOn(QueriesModule, 'useApproveAsset').mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof QueriesModule.useApproveAsset>);

    vi.spyOn(QueriesModule, 'useAddComment').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof QueriesModule.useAddComment>);

    renderWithProviders(<AssetReviewPage />);

    expect(screen.queryByRole('button', { name: /Approve Asset/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Request Changes/i })).not.toBeInTheDocument();
  });
});
