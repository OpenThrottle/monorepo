import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

import type { ChatSessionDiffFile } from '../../types';
import type { ChatSessionDrawerChangesDialogProps } from '../ChatSessionDrawerChangesDialog';
import { ChatSessionDrawerChangesDialog } from '../ChatSessionDrawerChangesDialog';

const FILE: ChatSessionDiffFile = {
  additions: 4,
  binary: false,
  deletions: 1,
  path: 'src/a.ts',
  previousPath: undefined,
  status: 'modified',
};

const OTHER: ChatSessionDiffFile = {
  ...FILE,
  path: 'src/b.ts',
  status: 'added',
};

const LAST: ChatSessionDiffFile = { ...FILE, path: 'src/c.ts' };

const PATCH = '@@ -1 +1 @@\n-old\n+new\n';

const renderDialog = (
  overrides: Partial<ChatSessionDrawerChangesDialogProps>,
) => {
  const onClose = vi.fn();
  const onSelectFile = vi.fn();
  const component = render(
    <ChatSessionDrawerChangesDialog
      file={FILE}
      files={[FILE, OTHER, LAST]}
      isTruncated={false}
      onClose={onClose}
      onSelectFile={onSelectFile}
      patch={PATCH}
      {...overrides}
    />,
  );

  return { component, onClose, onSelectFile };
};

describe('ChatSessionDrawerChangesDialog', () => {
  describe('when no file is selected', () => {
    test('stays closed', () => {
      const { component } = renderDialog({ file: undefined });

      expect(component.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('when a file is selected', () => {
    test('opens titled with the path and shows its patch', () => {
      const { component } = renderDialog({});
      const dialog = component.getByRole('dialog', { name: 'src/a.ts' });

      expect(dialog).toHaveTextContent('+4 −1');
      expect(component.getAllByTestId('DiffView-line')).toHaveLength(3);
    });

    test('reports onClose when dismissed', async () => {
      const { component, onClose } = renderDialog({});

      await userEvent.keyboard('{Escape}');

      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1);
      });
      expect(component.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('when the file is binary', () => {
    test('omits the counts and says there is no patch', () => {
      const { component } = renderDialog({
        file: { ...FILE, binary: true },
        patch: undefined,
      });

      expect(component.getByRole('dialog')).not.toHaveTextContent('+4');
      expect(
        component.getByTestId('ChatSessionDrawerChangesPatch-note'),
      ).toHaveTextContent('Binary file');
    });
  });

  describe('when stepping through the files', () => {
    test('the right arrow selects the next file', async () => {
      const { onSelectFile } = renderDialog({});

      await userEvent.keyboard('{ArrowRight}');

      expect(onSelectFile).toHaveBeenCalledWith('src/b.ts');
    });

    test('the left arrow wraps from the first file to the last', async () => {
      const { onSelectFile } = renderDialog({});

      await userEvent.keyboard('{ArrowLeft}');

      expect(onSelectFile).toHaveBeenCalledWith('src/c.ts');
    });

    test('ignores an arrow held with a modifier', async () => {
      const { onSelectFile } = renderDialog({});

      await userEvent.keyboard('{Meta>}{ArrowRight}{/Meta}');

      expect(onSelectFile).not.toHaveBeenCalled();
    });

    test('the buttons step too and show the position', async () => {
      const { component, onSelectFile } = renderDialog({ file: OTHER });

      expect(
        component.getByTestId('ChatSessionDrawerChangesDialog-position'),
      ).toHaveTextContent('2 of 3');

      await userEvent.click(
        component.getByRole('button', { name: 'Previous file' }),
      );
      await userEvent.click(
        component.getByRole('button', { name: 'Next file' }),
      );

      expect(onSelectFile.mock.calls).toEqual([['src/a.ts'], ['src/c.ts']]);
    });
  });

  describe('when only one file changed', () => {
    test('hides the navigation and the arrows do nothing', async () => {
      const { component, onSelectFile } = renderDialog({ files: [FILE] });

      await userEvent.keyboard('{ArrowRight}');

      expect(onSelectFile).not.toHaveBeenCalled();
      expect(
        component.queryByRole('button', { name: 'Next file' }),
      ).not.toBeInTheDocument();
    });
  });
});
