import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Badge } from '../src/components/ui/badge.js';
import { ASSET_STATUSES, type AssetStatus } from '@proofline/shared';

describe('Badge Component', () => {
  it.each(ASSET_STATUSES)('renders correct label and styling for AssetStatus: %s', (status: AssetStatus) => {
    const { unmount } = render(<Badge status={status} />);
    const dot = screen.getByTestId('badge-dot');
    expect(dot).toBeInTheDocument();

    const labelMap: Record<AssetStatus, string> = {
      DRAFT: 'Draft',
      IN_REVIEW: 'In Review',
      CHANGES_REQUESTED: 'Changes Requested',
      APPROVED: 'Approved',
      ARCHIVED: 'Archived',
    };

    expect(screen.getByText(labelMap[status])).toBeInTheDocument();
    unmount();
  });
});
