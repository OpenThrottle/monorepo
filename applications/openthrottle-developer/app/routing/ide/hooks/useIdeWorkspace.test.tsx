import { act, render } from '@testing-library/react';
import { createRoutesStub, useSearchParams } from 'react-router';
import { describe, expect, test } from 'vitest';
import { useIdeWorkspace } from './useIdeWorkspace';
import type { UseIdeWorkspaceResult } from './useIdeWorkspace';

interface WorkspaceProbeValue {
  search: URLSearchParams;
  workspace: UseIdeWorkspaceResult;
}

function renderWorkspace(
  selectedId: string | null,
  initialEntries: string[] = ['/'],
): { current: WorkspaceProbeValue | null } {
  const value: { current: WorkspaceProbeValue | null } = { current: null };
  function WorkspaceProbe(): null {
    const [search] = useSearchParams();
    const workspace = useIdeWorkspace(selectedId);
    value.current = { search, workspace };
    return null;
  }
  const Stub = createRoutesStub([{ Component: WorkspaceProbe, path: '/' }]);
  render(<Stub initialEntries={initialEntries} />);
  return value;
}

describe('useIdeWorkspace', () => {
  test('returns idle initial state when no repository is selected', () => {
    const value = renderWorkspace(null);

    expect(value.current?.workspace.selectedSymbol).toBeUndefined();
    expect(value.current?.workspace.semanticQuery).toBe('');
    expect(value.current?.workspace.exportsData).toBeUndefined();
    expect(value.current?.workspace.exportsLoading).toBe(false);
    expect(value.current?.workspace.indexBusy).toBe(false);
    // No repository selected yet, so the semantic fetcher never issued a
    // request; loading stays true only while data is genuinely pending
    // relative to a selected repo per the hook's own `semanticLoading` rule.
    expect(value.current?.workspace.semanticLoading).toBe(true);
  });

  test('handleSelectRepository sets repositoryId and clears the `q` param', () => {
    const value = renderWorkspace('repo-1', ['/?q=stale']);

    act(() => value.current?.workspace.handleSelectRepository('repo-2'));

    expect(value.current?.search.get('repositoryId')).toBe('repo-2');
    expect(value.current?.search.get('q')).toBeNull();
  });

  test('handleSearch sets or clears the `q` param', () => {
    const value = renderWorkspace('repo-1');

    act(() => value.current?.workspace.handleSearch('exports'));
    expect(value.current?.search.get('q')).toBe('exports');

    act(() => value.current?.workspace.handleSearch(''));
    expect(value.current?.search.get('q')).toBeNull();
  });

  test('handleIndex is a no-op when no repository is selected', () => {
    const value = renderWorkspace(null);

    expect(() =>
      act(() => value.current?.workspace.handleIndex()),
    ).not.toThrow();
    expect(value.current?.workspace.indexBusy).toBe(false);
  });
});
