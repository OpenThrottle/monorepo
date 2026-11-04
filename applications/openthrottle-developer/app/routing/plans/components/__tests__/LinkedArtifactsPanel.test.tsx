import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import type {
  LinkedArtifactRow,
  LinkedArtifactsPanelProps,
} from '../LinkedArtifactsPanel';
import { LinkedArtifactsPanel } from '../LinkedArtifactsPanel';

const PLAN_ID = 'plan-1';

const artifact = (
  overrides: Partial<LinkedArtifactRow>,
): LinkedArtifactRow => ({
  createdAt: '2026-07-13T00:00:00.000Z',
  externalKey: 'github:o/r@abc',
  id: 'art-1',
  lifecycle: 'created',
  message: null,
  payloadJson: JSON.stringify({ repo: 'o/r', sha: 'abc1234def' }),
  producedAt: '2026-07-13T00:00:00.000Z',
  sessionId: 'sess-1',
  source: 'agent',
  type: 'git_commit',
  verification: 'unverified',
  verifiedAt: null,
  ...overrides,
});

const statusChange = (id: string, to: string): LinkedArtifactRow =>
  artifact({
    externalKey: `status_change:task:t-${id}:${to}:uuid`,
    id,
    lifecycle: null,
    payloadJson: JSON.stringify({
      entity: 'task',
      from: 'PENDING',
      id: `t-${id}`,
      to,
    }),
    type: 'status_change',
  });

/** The panel reads planId from route params, so the stub must supply one. */
const renderPanel = (props: LinkedArtifactsPanelProps): RenderResult => {
  const Component = () => <LinkedArtifactsPanel {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/plans/:planId' }]);

  return render(<RoutesStub initialEntries={[`/plans/${PLAN_ID}`]} />);
};

describe('LinkedArtifactsPanel Component', () => {
  describe('typed labels and deep links', () => {
    test('renders a commit as owner/repo@<short sha> linking to GitHub', () => {
      const component = renderPanel({ artifacts: [artifact({})] });

      expect(component.getByText('o/r@')).toBeInTheDocument();
      expect(component.getByText('abc1234')).toBeInTheDocument();
      expect(component.getByRole('link')).toHaveAttribute(
        'href',
        'https://github.com/o/r/commit/abc1234def',
      );
    });

    test('renders a pull request as owner/repo#<number>', () => {
      const component = renderPanel({
        artifacts: [
          artifact({
            externalKey: 'github:o/r#509',
            lifecycle: 'merged',
            payloadJson: JSON.stringify({ number: 509, repo: 'o/r' }),
            type: 'pull_request',
          }),
        ],
      });

      expect(component.getByText('o/r')).toBeInTheDocument();
      expect(component.getByText('#509')).toBeInTheDocument();
      expect(component.getByRole('link')).toHaveAttribute(
        'href',
        'https://github.com/o/r/pull/509',
      );
    });

    test('renders a status change as a transition linking in-app to the task', async () => {
      const user = userEvent.setup();
      const component = renderPanel({
        artifacts: [statusChange('s1', 'COMPLETED')],
      });

      // status_change collapses by default; open it to reach the row.
      await user.click(component.getByText('Status changes'));

      expect(component.getByText('PENDING → COMPLETED')).toBeInTheDocument();
      expect(component.getByRole('link')).toHaveAttribute(
        'href',
        `/plans/${PLAN_ID}/tasks/t-s1`,
      );
    });

    test('degrades a malformed payload to type + externalKey without throwing', () => {
      const component = renderPanel({
        artifacts: [
          artifact({ externalKey: 'github:o/r@abc', payloadJson: '{not json' }),
        ],
      });

      expect(
        component.getByText('git_commit github:o/r@abc'),
      ).toBeInTheDocument();
      expect(component.queryByRole('link')).not.toBeInTheDocument();
    });
  });

  describe('grouping', () => {
    test('collapses status_change by default so commits stay visible', () => {
      const component = renderPanel({
        artifacts: [
          artifact({ id: 'c1' }),
          ...Array.from({ length: 6 }, (_, index) =>
            statusChange(`s${index}`, 'COMPLETED'),
          ),
        ],
      });

      // The commit is visible immediately...
      expect(component.getByText('abc1234')).toBeInTheDocument();
      // ...while the transition wall is behind a disclosure showing a remainder.
      expect(component.getByText(/\+4/)).toBeInTheDocument();
    });

    test('orders the commit group above the status-change group', () => {
      const component = renderPanel({
        artifacts: [statusChange('s1', 'COMPLETED'), artifact({ id: 'c1' })],
      });

      // Scope to the group sections; the filter chips carry the same labels.
      const headers = component
        .getAllByTestId('LinkedArtifactGroup')
        .map((group) => group.textContent ?? '');

      expect(headers[0]).toContain('Commits');
      expect(headers[1]).toContain('Status changes');
    });
  });

  describe('summary and filters', () => {
    test('summarizes the ledger by verification', () => {
      const component = renderPanel({
        artifacts: [
          artifact({ id: 'a1', verification: 'verified' }),
          artifact({ id: 'a2', verification: 'orphaned' }),
        ],
      });

      expect(component.getByText('2 artifacts')).toBeInTheDocument();
      expect(component.getByText('1 orphaned')).toBeInTheDocument();
    });

    test('a filter that matches nothing shows a message, not an empty panel', async () => {
      const user = userEvent.setup();
      const component = renderPanel({
        artifacts: [artifact({ id: 'a1', verification: 'verified' })],
      });

      await user.click(component.getByRole('button', { name: 'orphaned' }));

      expect(component.getByTestId('LinkedArtifactsPanel')).toBeInTheDocument();
      expect(
        component.getByText('No artifacts match the current filters.'),
      ).toBeInTheDocument();
    });

    test('a verification filter narrows the visible rows', async () => {
      const user = userEvent.setup();
      const component = renderPanel({
        artifacts: [
          artifact({ id: 'a1', verification: 'verified' }),
          artifact({
            externalKey: 'github:o/r@zzz',
            id: 'a2',
            payloadJson: JSON.stringify({ repo: 'o/r', sha: 'zzz9999aaa' }),
            verification: 'orphaned',
          }),
        ],
      });

      await user.click(component.getByRole('button', { name: 'orphaned' }));

      expect(component.getByText('zzz9999')).toBeInTheDocument();
      expect(component.queryByText('abc1234')).not.toBeInTheDocument();
    });
  });

  describe('with no artifacts', () => {
    test('renders nothing (returns null) for a genuinely empty ledger', () => {
      const { container } = renderPanel({ artifacts: [] });

      expect(container).toBeEmptyDOMElement();
    });
  });
});
