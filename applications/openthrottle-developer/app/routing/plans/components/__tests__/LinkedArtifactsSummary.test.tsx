import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';

import type { LinkedArtifactsSummaryProps } from '../LinkedArtifactsSummary';
import { LinkedArtifactsSummary } from '../LinkedArtifactsSummary';

const renderSummary = (
  overrides: Partial<LinkedArtifactsSummaryProps> = {},
): RenderResult => {
  const props: LinkedArtifactsSummaryProps = {
    onTypeChange: vi.fn(),
    onVerificationChange: vi.fn(),
    summary: {
      byVerification: { orphaned: 0, unverified: 1, verified: 4 },
      presentTypes: ['git_commit', 'status_change'],
      total: 5,
    },
    typeFilter: 'all',
    verificationFilter: 'all',
    ...overrides,
  };

  const Component = () => <LinkedArtifactsSummary {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('LinkedArtifactsSummary Component', () => {
  test('shows the total and every per-verification count', () => {
    const component = renderSummary();

    expect(component.getByTestId('LinkedArtifactsSummary')).toBeInTheDocument();
    expect(component.getByText('5 artifacts')).toBeInTheDocument();
    expect(component.getByText('4 verified')).toBeInTheDocument();
    expect(component.getByText('1 unverified')).toBeInTheDocument();
    expect(component.getByText('0 orphaned')).toBeInTheDocument();
  });

  describe('orphaned emphasis', () => {
    test('stays muted at zero', () => {
      expect(renderSummary().getByText('0 orphaned').className).toContain(
        'text-muted-foreground',
      );
    });

    test('is emphasized once non-zero', () => {
      const component = renderSummary({
        summary: {
          byVerification: { orphaned: 2, unverified: 0, verified: 3 },
          presentTypes: ['git_commit'],
          total: 5,
        },
      });

      expect(component.getByText('2 orphaned').className).toContain(
        'font-semibold',
      );
    });
  });

  test('reports a verification filter selection to the caller', async () => {
    const user = userEvent.setup();
    const onVerificationChange = vi.fn();
    const component = renderSummary({ onVerificationChange });

    await user.click(component.getByRole('button', { name: 'orphaned' }));

    expect(onVerificationChange).toHaveBeenCalledWith('orphaned');
  });

  test('drives the type filter from the types present, not a fixed list', () => {
    const component = renderSummary();

    expect(component.getByText('Commits')).toBeInTheDocument();
    expect(component.getByText('Status changes')).toBeInTheDocument();
    expect(component.queryByText('Deployments')).not.toBeInTheDocument();
  });

  test('hides the type filter when only one type is present', () => {
    const component = renderSummary({
      summary: {
        byVerification: { orphaned: 0, unverified: 0, verified: 1 },
        presentTypes: ['git_commit'],
        total: 1,
      },
    });

    expect(component.queryByText('All types')).not.toBeInTheDocument();
  });
});
