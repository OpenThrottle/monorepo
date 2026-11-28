import { act, renderHook, waitFor } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';

import type { AgentTrajectoryPlanGroupPageRowFragment } from '~/__generated__/graphql';
import {
  MOCK_PLAN_GROUP,
  MOCK_PLAN_GROUP_PAGE,
  MOCK_UNKNOWN_PLAN_GROUP,
} from '~/routing/evals/data/mock.trajectory-plan-groups';

import type { UseTrajectoryPlanGroupPagesOptions } from '../useTrajectoryPlanGroupPages';
import { useTrajectoryPlanGroupPages } from '../useTrajectoryPlanGroupPages';

const FIRST_PAGE: AgentTrajectoryPlanGroupPageRowFragment = {
  endCursor: 'cursor-1',
  groups: [MOCK_PLAN_GROUP],
  hasNextPage: true,
};
const SECOND_PAGE: AgentTrajectoryPlanGroupPageRowFragment = {
  endCursor: 'cursor-2',
  groups: [MOCK_UNKNOWN_PLAN_GROUP],
  hasNextPage: false,
};

const renderPages = (
  initialOptions: UseTrajectoryPlanGroupPagesOptions,
  loader: (args: { readonly request: Request }) => unknown,
) => {
  const wrapper = (props: React.PropsWithChildren): React.ReactElement => {
    const Component = (): React.ReactElement => {
      return <>{props.children}</>;
    };
    const RoutesStub = createRoutesStub([
      { Component, path: '/' },
      { loader, path: '/evals/trajectories' },
    ]);

    return <RoutesStub />;
  };

  return renderHook(
    (options: UseTrajectoryPlanGroupPagesOptions) => {
      return useTrajectoryPlanGroupPages(options);
    },
    { initialProps: initialOptions, wrapper },
  );
};

const OPTIONS: UseTrajectoryPlanGroupPagesOptions = {
  filter: 'unscored',
  initialPage: FIRST_PAGE,
  repositoryId: 'repo-1',
};

describe('useTrajectoryPlanGroupPages', () => {
  test('starts from the loader page', () => {
    const { result } = renderPages(OPTIONS, vi.fn());

    expect(result.current.groups).toEqual([MOCK_PLAN_GROUP]);
    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.isLoadingMore).toBe(false);
  });

  test('fetches the next page with the cursor and appends it', async () => {
    const loader = vi.fn((_args: { readonly request: Request }) => {
      return { page: SECOND_PAGE };
    });
    const { result } = renderPages(OPTIONS, loader);

    act(() => {
      result.current.onLoadMore();
    });

    await waitFor(() => {
      expect(result.current.groups).toEqual([
        MOCK_PLAN_GROUP,
        MOCK_UNKNOWN_PLAN_GROUP,
      ]);
    });
    expect(result.current.hasNextPage).toBe(false);

    const url = new URL(loader.mock.calls[0]?.[0].request.url ?? '');

    expect(url.searchParams.get('after')).toBe('cursor-1');
    expect(url.searchParams.get('repositoryId')).toBe('repo-1');
  });

  test('starts over when the loader serves a new first page', () => {
    const { rerender, result } = renderPages(OPTIONS, vi.fn());

    rerender({ ...OPTIONS, initialPage: MOCK_PLAN_GROUP_PAGE });

    expect(result.current.groups).toEqual(MOCK_PLAN_GROUP_PAGE.groups);
  });

  test('does nothing on the last page', () => {
    const loader = vi.fn();
    const { result } = renderPages(
      { ...OPTIONS, initialPage: SECOND_PAGE },
      loader,
    );

    act(() => {
      result.current.onLoadMore();
    });

    expect(loader).not.toHaveBeenCalled();
  });
});
