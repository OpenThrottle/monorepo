import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

import type { ChatSessionDiffFile } from '../../types';
import { ChatSessionDrawerChangesRow } from '../ChatSessionDrawerChangesRow';

const FILE: ChatSessionDiffFile = {
  additions: 3,
  binary: false,
  deletions: 1,
  path: 'src/a.ts',
  previousPath: undefined,
  status: 'modified',
};

const toHref = (path: string): string | null => {
  return `vscode://file/repo/${path}`;
};

const renderRow = (
  file: ChatSessionDiffFile,
  isSelected = false,
  buildFileHref: ((path: string) => string | null) | undefined = undefined,
) => {
  const onSelect = vi.fn();
  const component = render(
    <ul>
      <ChatSessionDrawerChangesRow
        buildFileHref={buildFileHref}
        file={file}
        isSelected={isSelected}
        isTouched={false}
        onSelect={onSelect}
      />
    </ul>,
  );

  return { component, onSelect };
};

describe('ChatSessionDrawerChangesRow', () => {
  test('reports its path on click', async () => {
    const { component, onSelect } = renderRow(FILE);

    await userEvent.click(component.getByRole('button'));

    expect(onSelect).toHaveBeenCalledWith('src/a.ts');
  });

  test('announces that it opens a dialog', () => {
    const { component } = renderRow(FILE, true);

    expect(component.getByRole('button')).toHaveAttribute(
      'aria-haspopup',
      'dialog',
    );
  });

  test('shows +/- counts, but not for a binary file', () => {
    const { component } = renderRow(FILE);

    expect(component.getByRole('button')).toHaveTextContent('+3');
    expect(component.getByRole('button')).toHaveTextContent('−1');

    const binary = renderRow({ ...FILE, binary: true });

    expect(
      binary.component.getAllByRole('button').at(-1),
    ).not.toHaveTextContent('+3');
  });

  test('a renamed file names its old path in the title', () => {
    const { component } = renderRow({
      ...FILE,
      previousPath: 'src/old.ts',
      status: 'renamed',
    });

    expect(component.getByRole('button')).toHaveAttribute(
      'title',
      'Renamed from src/old.ts',
    );
  });

  test('links to the file in the editor beside the show-diff button', async () => {
    const { component, onSelect } = renderRow(FILE, false, toHref);
    const link = component.getByRole('link', {
      name: 'Open src/a.ts in your editor',
    });

    expect(link).toHaveAttribute('href', 'vscode://file/repo/src/a.ts');
    await userEvent.click(component.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith('src/a.ts');
  });

  test('has no editor link without a builder or when it yields null', () => {
    expect(renderRow(FILE).component.queryByRole('link')).toBeNull();
    expect(
      renderRow(FILE, false, () => null).component.queryByRole('link'),
    ).toBeNull();
  });
});
