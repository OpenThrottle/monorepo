import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

import type { ChatSessionDiffAvailable } from '../../types';
import type { SessionFile } from '../../utils/deriveSessionFiles';
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

const touched = (path: string): SessionFile => {
  return { added: 1, count: 1, op: 'modified', path, removed: 0 };
};

const renderChanges = (overrides: Partial<ChatSessionDrawerChangesProps>) => {
  const onCloseFile = vi.fn();
  const onRefresh = vi.fn();
  const onSelectFile = vi.fn();
  const component = render(
    <ChatSessionDrawerChanges
      buildFileHref={undefined}
      diff={DIFF}
      isLoading={false}
      isPatchTruncated={false}
      isStreaming={false}
      onCloseFile={onCloseFile}
      onRefresh={onRefresh}
      onSelectFile={onSelectFile}
      selectedFile={undefined}
      selectedPatch={undefined}
      touchedFiles={[]}
      {...overrides}
    />,
  );

  return { component, onCloseFile, onRefresh, onSelectFile };
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

    test('opens the selected file patch in a dialog', () => {
      const { component } = renderChanges({
        selectedFile: 'src/a.ts',
        selectedPatch: '@@ -1 +1 @@\n-old\n+new\n',
      });

      expect(
        component.getByRole('dialog', { name: 'src/a.ts' }),
      ).toBeInTheDocument();
      expect(component.getAllByTestId('DiffView-line')).toHaveLength(3);
    });

    test('keeps the dialog closed with no selection', () => {
      const { component } = renderChanges({});

      expect(component.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('closing the dialog reports onCloseFile', async () => {
      const { onCloseFile } = renderChanges({
        selectedFile: 'src/a.ts',
        selectedPatch: '@@ -1 +1 @@\n-old\n+new\n',
      });

      await userEvent.keyboard('{Escape}');

      expect(onCloseFile).toHaveBeenCalledTimes(1);
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

  describe('when this conversation touched files', () => {
    test('marks the changed files it touched', () => {
      const { component } = renderChanges({
        touchedFiles: [touched('src/b.ts')],
      });
      const rows = component.getAllByTestId('ChatSessionDrawerChanges-row');

      expect(
        rows[0]?.querySelector(
          '[data-testid="ChatSessionDrawerChanges-touched"]',
        ),
      ).toBeNull();
      expect(rows[1]).toContainElement(
        component.getByTestId('ChatSessionDrawerChanges-touched'),
      );
    });

    test('lists touched files the diff nets out as no net change', () => {
      const { component } = renderChanges({
        touchedFiles: [touched('src/a.ts'), touched('src/gone.ts')],
      });
      const list = component.getByTestId('ChatSessionDrawerChangesTouched');

      expect(list).toHaveTextContent('Touched in this chat, no net change');
      expect(
        component.getAllByTestId('ChatSessionDrawerChangesTouched-row'),
      ).toHaveLength(1);
      expect(list).toHaveTextContent('gone.ts');
    });

    test('does not claim no net change while a turn streams', () => {
      const { component } = renderChanges({
        isStreaming: true,
        touchedFiles: [touched('src/new.ts')],
      });

      expect(
        component.getByTestId('ChatSessionDrawerChangesTouched'),
      ).not.toHaveTextContent('no net change');
    });

    test('still lists them when there is no diff', () => {
      const { component } = renderChanges({
        diff: { available: false, reason: 'Not a git repository.' },
        touchedFiles: [touched('src/a.ts')],
      });

      expect(
        component.getByTestId('ChatSessionDrawerChanges'),
      ).toHaveTextContent('Not a git repository.');
      expect(
        component.getByTestId('ChatSessionDrawerChangesTouched'),
      ).toHaveTextContent('a.ts');
    });
  });

  describe('when the host supplies a file-link builder', () => {
    test('puts an open-in-editor link on every changed file', () => {
      const { component } = renderChanges({
        buildFileHref: (path) => `vscode://file/repo/${path}`,
      });

      expect(
        component.getAllByRole('link').map((link) => link.getAttribute('href')),
      ).toEqual(['vscode://file/repo/src/a.ts', 'vscode://file/repo/src/b.ts']);
    });
  });
});
