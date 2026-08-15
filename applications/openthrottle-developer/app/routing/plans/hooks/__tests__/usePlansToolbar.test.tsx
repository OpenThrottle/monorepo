import * as React from 'react';
import { act, render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub, useSearchParams } from 'react-router';
import { describe, expect, test } from 'vitest';
import { usePlansToolbar } from '../usePlansToolbar';
import type {
  UsePlansToolbarOptions,
  UsePlansToolbarResult,
} from '../usePlansToolbar';

interface ToolbarProbeValue {
  hook: UsePlansToolbarResult;
  search: URLSearchParams;
}

function renderToolbar(
  options: UsePlansToolbarOptions,
  initialEntries: string[] = ['/'],
): { component: RenderResult; value: { current: ToolbarProbeValue | null } } {
  const value: { current: ToolbarProbeValue | null } = { current: null };
  function ToolbarProbe(): React.ReactElement {
    const [search] = useSearchParams();
    const hook = usePlansToolbar(options);
    value.current = { hook, search };
    return <div data-testid="probe" />;
  }
  const Stub = createRoutesStub([{ Component: ToolbarProbe, path: '/' }]);
  const component = render(<Stub initialEntries={initialEntries} />);
  return { component, value };
}

describe('usePlansToolbar', () => {
  test('handleAssigneeChange replaces the assignee list and resets page', () => {
    const { value } = renderToolbar({ limit: 25, page: 2 }, ['/?page=2']);

    act(() => value.current?.hook.handleAssigneeChange(['alice', 'bob']));

    expect(value.current?.search.getAll('assignee')).toEqual(['alice', 'bob']);
    expect(value.current?.search.get('page')).toBe('1');
  });

  test('handleStatusChange replaces the status list and resets page', () => {
    const { value } = renderToolbar({ limit: 25, page: 2 }, [
      '/?status=BACKLOG&page=2',
    ]);

    act(() => value.current?.hook.handleStatusChange(['IN_PROGRESS']));

    expect(value.current?.search.getAll('status')).toEqual(['IN_PROGRESS']);
    expect(value.current?.search.get('page')).toBe('1');
  });

  test('handleSortChange sets sortBy/sortOrder and preserves page/limit', () => {
    const { value } = renderToolbar({ limit: 25, page: 4 });

    act(() => value.current?.hook.handleSortChange('name', 'asc'));

    expect(value.current?.search.get('sortBy')).toBe('name');
    expect(value.current?.search.get('sortOrder')).toBe('asc');
    expect(value.current?.search.get('page')).toBe('4');
    expect(value.current?.search.get('limit')).toBe('25');
  });
});
