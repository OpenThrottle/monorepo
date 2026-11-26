import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

import type { ChatSessionDiffAvailable } from '../../types';
import type { ChatSessionDrawerChangesProps } from '../ChatSessionDrawerChanges';
import { ChatSessionDrawerChanges } from '../ChatSessionDrawerChanges';

const DIFF: ChatSessionDiffAvailable = {
  additions: 5,
  available: true,
  baseRef: 'origin/main',
  deletions: 2,
  files: [
    {
      additions: 4,
      binary: false,
      deletions: 1,
      path: 'src/a.ts',
      previousPath: undefined,
      status: 'modified',
    },
    {
      additions: 1,
      binary: false,
      deletions: 1,
      path: 'src/b.ts',
      previousPath: undefined,
      status: 'added',
    },
  ],
  filesTruncated: false,
  headBranch: 'feat/x',
  pullRequest: undefined,
};

const renderChanges = (overrides: Partial<ChatSessionDrawerChangesProps>) => {
  const onRefresh = vi.fn();
  const onSelectFile = vi.fn();
  const component = render(
    <ChatSessionDrawerChanges
      diff={DIFF}
      isLoading={false}
      isPatchTruncated={false}
      onRefresh={onRefresh}
      onSelectFile={onSelectFile}
      selectedFile={undefined}
      selectedPatch={undefined}
      {...overrides}
    />,
  );

  return { component, onRefresh, onSelectFile };
};

describe('ChatSessionDrawerChanges', () => {
  describe('when there is no diff', () => {
    test('asks for a checkout', () => {
      const { component } = renderChanges({ diff: undefined });

      expect(
        component.getByTestId('ChatSessionDrawerChanges'),
      ).toHaveTextContent('Pick a checkout');
    });

    test('says it is loading while a fetch is in flight', () => {
      const { component } = renderChanges({ diff: undefined, isLoading: true });

      expect(
        component.getByTestId('ChatSessionDrawerChanges'),
      ).toHaveTextContent('Loading changes');
    });
  });

  describe('when the diff is unavailable', () => {
    test('shows the reason', () => {
      const { component } = renderChanges({
        diff: { available: false, reason: 'Not a git repository.' },
      });

      expect(
        component.getByTestId('ChatSessionDrawerChanges'),
      ).toHaveTextContent('Not a git repository.');
    });
  });

  describe('when files changed', () => {
    test('summarizes the totals against the base', () => {
      const { component } = renderChanges({});

      expect(
        component.getByTestId('ChatSessionDrawerChanges-summary'),
      ).toHaveTextContent('+5 −2 across 2 files vs origin/main');
    });

    test('renders a row per file and reports a selection', async () => {
      const { component, onSelectFile } = renderChanges({});
      const rows = component.getAllByTestId('ChatSessionDrawerChanges-row');

      expect(rows).toHaveLength(2);
      expect(rows[1]).toHaveAttribute('data-status', 'added');

      await userEvent.click(component.getByTitle('src/a.ts'));

      expect(onSelectFile).toHaveBeenCalledWith('src/a.ts');
    });

    test('refresh reports onRefresh and disables while loading', async () => {
      const { component, onRefresh } = renderChanges({});

      await userEvent.click(
        component.getByTestId('ChatSessionDrawerChanges-refresh'),
      );

      expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    test('shows the selected file patch', () => {
      const { component } = renderChanges({
        selectedFile: 'src/a.ts',
        selectedPatch: '@@ -1 +1 @@\n-old\n+new\n',
      });

      expect(
        component.getByTestId('ChatSessionDrawerChangesPatch'),
      ).toBeInTheDocument();
      expect(component.getAllByTestId('DiffView-line')).toHaveLength(3);
    });
  });

  describe('when there are no files', () => {
    test('says nothing changed against the base', () => {
      const { component } = renderChanges({
        diff: { ...DIFF, additions: 0, deletions: 0, files: [] },
      });

      expect(
        component.getByTestId('ChatSessionDrawerChanges'),
      ).toHaveTextContent('No changes against origin/main.');
    });
  });

  describe('when the branch has a pull request', () => {
    test('links to it in a new tab', () => {
      const { component } = renderChanges({
        diff: {
          ...DIFF,
          pullRequest: {
            number: 7,
            state: 'open',
            url: 'https://github.com/acme/repo/pull/7',
          },
        },
      });
      const chip = component.getByRole('link', { name: /#7/ });

      expect(chip).toHaveAttribute(
        'href',
        'https://github.com/acme/repo/pull/7',
      );
      expect(chip).toHaveAttribute('target', '_blank');
      expect(chip).toHaveAttribute('rel', expect.stringContaining('noopener'));
    });
  });
});
