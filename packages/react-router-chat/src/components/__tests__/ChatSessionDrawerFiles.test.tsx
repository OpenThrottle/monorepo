import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

import type { ChatMessage } from '../../types';
import { ChatSessionDrawerFiles } from '../ChatSessionDrawerFiles';

const edit = (id: string, path: string): ChatMessage => {
  return {
    body: '',
    events: [
      {
        argsJson: JSON.stringify({
          file_path: path,
          new_string: 'a',
          old_string: 'b',
        }),
        callId: id,
        error: null,
        kind: 'tool',
        name: 'Edit',
        resultJson: null,
        sortOrder: 1,
        status: 'succeeded',
      },
    ],
    id,
    role: 'assistant',
  };
};

describe('ChatSessionDrawerFiles', () => {
  describe('when no file was touched', () => {
    test('renders the empty line only', () => {
      const component = render(
        <ChatSessionDrawerFiles
          messages={[]}
          onSelectFile={undefined}
          rootPath={undefined}
        />,
      );

      expect(
        component.getByTestId('ChatSessionDrawerFiles'),
      ).toBeInTheDocument();
      expect(component.queryByTestId('ChatSessionDrawerFiles-row')).toBeNull();
    });
  });

  describe('when files were edited', () => {
    test('renders one row per file, relative to the root, with counts', () => {
      const component = render(
        <ChatSessionDrawerFiles
          messages={[edit('1', '/repo/src/a.ts'), edit('2', '/repo/b.ts')]}
          onSelectFile={undefined}
          rootPath="/repo/"
        />,
      );
      const rows = component.getAllByTestId('ChatSessionDrawerFiles-row');

      expect(rows).toHaveLength(2);
      expect(rows[0]).toHaveAttribute('title', 'b.ts');
      expect(rows[1]).toHaveAttribute('title', 'src/a.ts');
      expect(rows[0]).toHaveAttribute('data-op', 'edited');
      expect(
        component.getAllByTestId('ChatSessionDrawerFiles-counts'),
      ).toHaveLength(2);
    });
  });

  describe('when the host can show diffs', () => {
    test('a row selects its file for the Changes section', async () => {
      const onSelectFile = vi.fn();
      const component = render(
        <ChatSessionDrawerFiles
          messages={[edit('1', '/repo/src/a.ts')]}
          onSelectFile={onSelectFile}
          rootPath="/repo"
        />,
      );

      await userEvent.click(
        component.getByRole('button', { name: 'Show diff for src/a.ts' }),
      );

      expect(onSelectFile).toHaveBeenCalledWith('src/a.ts');
    });

    test('rows are not buttons without a handler', () => {
      const component = render(
        <ChatSessionDrawerFiles
          messages={[edit('1', '/repo/src/a.ts')]}
          onSelectFile={undefined}
          rootPath="/repo"
        />,
      );

      expect(component.queryByRole('button')).toBeNull();
    });
  });
});
