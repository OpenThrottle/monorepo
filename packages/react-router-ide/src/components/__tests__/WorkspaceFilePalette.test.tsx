import { act, fireEvent, render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { WorkspaceFilePalette } from '../WorkspaceFilePalette';
import { DEFAULT_DEBOUNCE_MS } from '../../hooks/useDebouncedValue';
import type { IdeWorkspaceListing } from '../../data/view-models';

const listing: IdeWorkspaceListing = {
  paths: ['src/a.ts', 'src/b.ts', 'lib/c.ts'],
  repository: { displayName: 'Repo One', repositoryId: 'r1' },
  truncated: false,
};

describe('WorkspaceFilePalette Component', () => {
  let component: RenderResult;

  test('renders a prompt and no files before the user types', () => {
    component = render(<WorkspaceFilePalette listing={listing} />);

    expect(component.getByTestId('WorkspaceFilePalette')).toBeInTheDocument();
    expect(component.getByText(/Type to filter 3 files/)).toBeInTheDocument();
    expect(component.queryByText('src/a.ts')).not.toBeInTheDocument();
  });

  test('client-filters paths as the user types', async () => {
    const user = userEvent.setup();
    component = render(<WorkspaceFilePalette listing={listing} />);

    await user.type(component.getByPlaceholderText(/Filter 3 files/), 'src');

    // Filtering is debounced, so wait for the matches to land.
    expect(await component.findByText('src/a.ts')).toBeInTheDocument();
    expect(component.getByText('src/b.ts')).toBeInTheDocument();
    expect(component.queryByText('lib/c.ts')).not.toBeInTheDocument();
  });

  test('renders an empty state when nothing matches', async () => {
    const user = userEvent.setup();
    component = render(<WorkspaceFilePalette listing={listing} />);

    await user.type(component.getByPlaceholderText(/Filter 3 files/), 'zzz');

    expect(await component.findByText(/No files match/)).toBeInTheDocument();
  });

  test('fires onSelectFile with the chosen path', async () => {
    const user = userEvent.setup();
    const onSelectFile = vi.fn();
    component = render(
      <WorkspaceFilePalette listing={listing} onSelectFile={onSelectFile} />,
    );

    await user.type(component.getByPlaceholderText(/Filter 3 files/), 'a.ts');
    await user.click(await component.findByText('src/a.ts'));

    expect(onSelectFile).toHaveBeenCalledWith('src/a.ts');
  });

  test('caps rendered matches and notes the remainder', async () => {
    const user = userEvent.setup();
    component = render(
      <WorkspaceFilePalette listing={listing} maxResults={1} />,
    );

    await user.type(component.getByPlaceholderText(/Filter 3 files/), 'src');

    expect(await component.findByText('src/a.ts')).toBeInTheDocument();
    expect(component.queryByText('src/b.ts')).not.toBeInTheDocument();
    expect(component.getByText(/Showing 1 of 2/)).toBeInTheDocument();
  });

  describe('debounce timing', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    // Driven with `fireEvent.change` rather than `userEvent`: under fake timers
    // `userEvent`'s internal scheduling deadlocks against cmdk, and the cited
    // precedent (`useDebouncedValue.test`) also exercises the timer directly.
    test('does not filter until the debounce window elapses, then renders matches', () => {
      component = render(<WorkspaceFilePalette listing={listing} />);

      act(() => {
        fireEvent.change(component.getByPlaceholderText(/Filter 3 files/), {
          target: { value: 'src' },
        });
      });

      // Before the quiet window, the debounced term is still empty, so the
      // listing is not scanned and no matches are rendered.
      expect(component.queryByText('src/a.ts')).not.toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(DEFAULT_DEBOUNCE_MS - 1);
      });
      expect(component.queryByText('src/a.ts')).not.toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(component.getByText('src/a.ts')).toBeInTheDocument();
      expect(component.getByText('src/b.ts')).toBeInTheDocument();
      expect(component.queryByText('lib/c.ts')).not.toBeInTheDocument();
    });
  });
});
