import { act, render, waitFor } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import type { ProjectPlanTasksData } from '~/routing/projects/types';

import type { UseProjectPlanTasksResult } from '../useProjectPlanTasks';
import { useProjectPlanTasks } from '../useProjectPlanTasks';

const PLAN_ID = '01a20175-9298-7f05-98f8-2e3080c7fa7f';

const TASKS = [
  { id: 'task-1', sortOrder: 1000, status: 'COMPLETED', title: 'First' },
  { id: 'task-2', sortOrder: 2000, status: 'PENDING', title: 'Second' },
];

interface RenderedTasks {
  readonly loaderCalls: string[];
  readonly value: { current: UseProjectPlanTasksResult | null };
}

/**
 * Render the hook behind a routes stub whose `/resources/project-plan-tasks`
 * loader answers with `respond`, recording each requested search string.
 */
const renderTasks = (
  respond: (call: number) => ProjectPlanTasksData,
): RenderedTasks => {
  const loaderCalls: string[] = [];
  const value: { current: UseProjectPlanTasksResult | null } = {
    current: null,
  };

  function Probe(): null {
    value.current = useProjectPlanTasks({ planId: PLAN_ID });

    return null;
  }

  const Stub = createRoutesStub([
    { Component: Probe, path: '/' },
    {
      loader: ({ request }) => {
        loaderCalls.push(new URL(request.url).search);

        return respond(loaderCalls.length);
      },
      path: '/resources/project-plan-tasks',
    },
  ]);

  render(<Stub initialEntries={['/']} />);

  return { loaderCalls, value };
};

const loaded = (): ProjectPlanTasksData => {
  return { kind: 'loaded', planId: PLAN_ID, tasks: TASKS };
};

describe('useProjectPlanTasks', () => {
  test('fetches nothing until load() is called', () => {
    const { loaderCalls, value } = renderTasks(loaded);

    expect(value.current?.state).toBe('idle');
    expect(loaderCalls).toEqual([]);
  });

  describe('when load() is called', () => {
    test('requests the plan tasks once and exposes them', async () => {
      const { loaderCalls, value } = renderTasks(loaded);

      act(() => {
        value.current?.load();
      });

      expect(value.current?.state).toBe('loading');

      await waitFor(() => {
        expect(value.current?.state).toBe('loaded');
      });
      expect(value.current).toMatchObject({ tasks: TASKS });
      expect(loaderCalls).toEqual([`?planId=${PLAN_ID}`]);
    });

    test('is a no-op once the tasks are loaded', async () => {
      const { loaderCalls, value } = renderTasks(loaded);

      act(() => {
        value.current?.load();
      });
      await waitFor(() => {
        expect(value.current?.state).toBe('loaded');
      });

      act(() => {
        value.current?.load();
      });

      expect(value.current?.state).toBe('loaded');
      expect(loaderCalls).toHaveLength(1);
    });
  });

  describe('when the request fails', () => {
    test('reports the error and retries on the next load()', async () => {
      const { loaderCalls, value } = renderTasks((call) => {
        if (call === 1) {
          return { kind: 'error', planId: PLAN_ID, reason: 'request-failed' };
        }

        return loaded();
      });

      act(() => {
        value.current?.load();
      });
      await waitFor(() => {
        expect(value.current?.state).toBe('error');
      });
      expect(value.current).toMatchObject({ reason: 'request-failed' });

      act(() => {
        value.current?.load();
      });
      await waitFor(() => {
        expect(value.current?.state).toBe('loaded');
      });
      expect(loaderCalls).toHaveLength(2);
    });
  });
});
