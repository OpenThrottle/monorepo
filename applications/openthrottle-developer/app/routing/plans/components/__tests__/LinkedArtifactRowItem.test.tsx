import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { LinkedArtifactRowItem } from '../LinkedArtifactRowItem';
import type { LinkedArtifactRow } from '../LinkedArtifactsPanel';

const artifact = (
  overrides: Partial<LinkedArtifactRow> = {},
): LinkedArtifactRow => ({
  createdAt: '2026-07-13T00:00:00.000Z',
  externalKey: 'github:o/r@abc1234',
  id: 'art-1',
  lifecycle: 'created',
  message: null,
  payloadJson: JSON.stringify({ repo: 'o/r', sha: 'abc1234def' }),
  producedAt: '2026-07-13T00:00:00.000Z',
  sessionId: 'sess-1',
  source: 'agent',
  type: 'git_commit',
  verification: 'verified',
  verifiedAt: null,
  ...overrides,
});

const renderRow = (
  overrides: Partial<LinkedArtifactRow> = {},
  planId: string | null = 'plan-1',
): RenderResult => {
  const Component = () => (
    <LinkedArtifactRowItem artifact={artifact(overrides)} planId={planId} />
  );
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('LinkedArtifactRowItem Component', () => {
  test('leads with the parsed commit label, not the raw external key', () => {
    const component = renderRow();

    expect(component.getByTestId('LinkedArtifactRowItem')).toBeInTheDocument();
    expect(component.getByText('o/r@')).toBeInTheDocument();
    expect(component.getByText('abc1234')).toBeInTheDocument();
    expect(component.queryByText('github:o/r@abc1234')).not.toBeInTheDocument();
  });

  test('links a commit out to GitHub in a new tab', () => {
    const component = renderRow();
    const link = component.getByRole('link');

    expect(link).toHaveAttribute(
      'href',
      'https://github.com/o/r/commit/abc1234def',
    );
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });

  test('renders a status_change as a transition linking in-app to the task', () => {
    const component = renderRow({
      externalKey: 'status_change:task:t1:COMPLETED:uuid',
      lifecycle: null,
      payloadJson: JSON.stringify({
        entity: 'task',
        from: 'PENDING',
        id: 't1',
        to: 'COMPLETED',
      }),
      type: 'status_change',
    });

    expect(component.getByText('PENDING → COMPLETED')).toBeInTheDocument();
    expect(component.getByRole('link')).toHaveAttribute(
      'href',
      '/plans/plan-1/tasks/t1',
    );
  });

  test('renders the lifecycle badge when the artifact carries one', () => {
    expect(renderRow().getByText('created')).toBeInTheDocument();
  });

  test('truncates the message but keeps the full text in the title', () => {
    const message = 'feat: a rather long commit subject line';
    const component = renderRow({ message });

    expect(component.getByText(message)).toHaveAttribute('title', message);
  });

  describe('verification', () => {
    test('pairs the badge with a when in its tooltip', () => {
      const component = renderRow({
        verifiedAt: '2026-07-14T00:00:00.000Z',
      });

      expect(component.getByText('verified').getAttribute('title')).toContain(
        'Verification: verified',
      );
      expect(component.getByText('verified').getAttribute('title')).not.toBe(
        'Verification: verified · not yet verified',
      );
    });

    test('says so when a claim has never been verified', () => {
      expect(
        renderRow({ verification: 'orphaned' })
          .getByText('orphaned')
          .getAttribute('title'),
      ).toBe('Verification: orphaned · not yet verified');
    });
  });

  test('renders plain text with no link when nothing resolves', () => {
    const component = renderRow({ payloadJson: '{not json' });

    expect(component.queryByRole('link')).not.toBeInTheDocument();
    expect(
      component.getByText('git_commit github:o/r@abc1234'),
    ).toBeInTheDocument();
  });
});
