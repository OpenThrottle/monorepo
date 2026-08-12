import { act, renderHook } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import type { PlanRunConfigRepositoryFieldsFragment } from '~/__generated__/graphql';
import {
  CHECKOUT_PREFIX,
  CUSTOM_VALUE,
  REPOSITORY_PREFIX,
  ROOT_VALUE,
} from '~/routing/plans/utils/plan-workflow-config-workspace-selector';
import {
  usePlanWorkflowConfigWorkspaceSelector,
  type PlanWorkflowConfigWorkspaceSelectorOptions,
} from './usePlanWorkflowConfigWorkspaceSelector';

type Checkout = PlanRunConfigRepositoryFieldsFragment['checkouts'][number];

const checkout = (id: string, displayName: string): Checkout => ({
  __typename: 'RepositoryCheckoutObject',
  displayName,
  filesystemPath: `/repos/${displayName}`,
  id,
  kind: 'worktree',
  managed: true,
});

const repository = (
  id: string,
  checkouts: readonly Checkout[],
  projectId?: string | null,
): PlanRunConfigRepositoryFieldsFragment => ({
  __typename: 'RepositoryObject',
  checkouts: [...checkouts],
  id,
  name: id,
  normalizedRemoteUrl: null,
  projectId: projectId ?? null,
});

const baseOptions = (
  overrides: Partial<PlanWorkflowConfigWorkspaceSelectorOptions> = {},
): PlanWorkflowConfigWorkspaceSelectorOptions => ({
  checkoutId: '',
  onCheckoutIdChange: vi.fn(),
  onRepositoryIdChange: vi.fn(),
  onWorkingDirectoryChange: vi.fn(),
  planProjectId: null,
  repositories: [],
  repositoryId: '',
  workingDirectory: '',
  ...overrides,
});

describe('usePlanWorkflowConfigWorkspaceSelector', () => {
  test('defaults to ROOT_VALUE when nothing is selected', () => {
    const { result } = renderHook(() =>
      usePlanWorkflowConfigWorkspaceSelector(baseOptions()),
    );

    expect(result.current.selectedValue).toBe(ROOT_VALUE);
    expect(result.current.selectedCheckout).toBeUndefined();
  });

  test('encodes checkoutId with CHECKOUT_PREFIX and precedence over the rest', () => {
    const repo1 = repository('repo-1', [checkout('c1', 'main')]);
    const { result } = renderHook(() =>
      usePlanWorkflowConfigWorkspaceSelector(
        baseOptions({
          checkoutId: 'c1',
          repositories: [repo1],
          repositoryId: 'repo-1',
          workingDirectory: '/some/path',
        }),
      ),
    );

    expect(result.current.selectedValue).toBe(`${CHECKOUT_PREFIX}c1`);
    expect(result.current.selectedCheckout).toEqual(checkout('c1', 'main'));
  });

  test('encodes repositoryId with REPOSITORY_PREFIX when no checkout is selected', () => {
    const { result } = renderHook(() =>
      usePlanWorkflowConfigWorkspaceSelector(
        baseOptions({ repositoryId: 'repo-1' }),
      ),
    );

    expect(result.current.selectedValue).toBe(`${REPOSITORY_PREFIX}repo-1`);
  });

  test('encodes a non-empty workingDirectory as CUSTOM_VALUE', () => {
    const { result } = renderHook(() =>
      usePlanWorkflowConfigWorkspaceSelector(
        baseOptions({ workingDirectory: '  /some/dir  ' }),
      ),
    );

    expect(result.current.selectedValue).toBe(CUSTOM_VALUE);
  });

  test('selectedCheckout is undefined when checkoutId matches no repository', () => {
    const repo1 = repository('repo-1', [checkout('c1', 'main')]);
    const { result } = renderHook(() =>
      usePlanWorkflowConfigWorkspaceSelector(
        baseOptions({ checkoutId: 'missing', repositories: [repo1] }),
      ),
    );

    expect(result.current.selectedCheckout).toBeUndefined();
  });

  describe('handleValueChange', () => {
    test('clears all three setters on ROOT_VALUE', () => {
      const onCheckoutIdChange = vi.fn();
      const onRepositoryIdChange = vi.fn();
      const onWorkingDirectoryChange = vi.fn();
      const { result } = renderHook(() =>
        usePlanWorkflowConfigWorkspaceSelector(
          baseOptions({
            onCheckoutIdChange,
            onRepositoryIdChange,
            onWorkingDirectoryChange,
          }),
        ),
      );

      act(() => result.current.handleValueChange(ROOT_VALUE));

      expect(onCheckoutIdChange).toHaveBeenCalledWith('');
      expect(onRepositoryIdChange).toHaveBeenCalledWith('');
      expect(onWorkingDirectoryChange).toHaveBeenCalledWith('');
    });

    test('clears checkout + repository but leaves workingDirectory on CUSTOM_VALUE', () => {
      const onCheckoutIdChange = vi.fn();
      const onRepositoryIdChange = vi.fn();
      const onWorkingDirectoryChange = vi.fn();
      const { result } = renderHook(() =>
        usePlanWorkflowConfigWorkspaceSelector(
          baseOptions({
            onCheckoutIdChange,
            onRepositoryIdChange,
            onWorkingDirectoryChange,
          }),
        ),
      );

      act(() => result.current.handleValueChange(CUSTOM_VALUE));

      expect(onCheckoutIdChange).toHaveBeenCalledWith('');
      expect(onRepositoryIdChange).toHaveBeenCalledWith('');
      expect(onWorkingDirectoryChange).not.toHaveBeenCalled();
    });

    test('routes a checkout: value to onCheckoutIdChange and clears the rest', () => {
      const onCheckoutIdChange = vi.fn();
      const onRepositoryIdChange = vi.fn();
      const onWorkingDirectoryChange = vi.fn();
      const { result } = renderHook(() =>
        usePlanWorkflowConfigWorkspaceSelector(
          baseOptions({
            onCheckoutIdChange,
            onRepositoryIdChange,
            onWorkingDirectoryChange,
          }),
        ),
      );

      act(() =>
        result.current.handleValueChange(`${CHECKOUT_PREFIX}checkout-9`),
      );

      expect(onCheckoutIdChange).toHaveBeenCalledWith('checkout-9');
      expect(onRepositoryIdChange).toHaveBeenCalledWith('');
      expect(onWorkingDirectoryChange).toHaveBeenCalledWith('');
    });

    test('routes a repo: value to onRepositoryIdChange and clears the rest', () => {
      const onCheckoutIdChange = vi.fn();
      const onRepositoryIdChange = vi.fn();
      const onWorkingDirectoryChange = vi.fn();
      const { result } = renderHook(() =>
        usePlanWorkflowConfigWorkspaceSelector(
          baseOptions({
            onCheckoutIdChange,
            onRepositoryIdChange,
            onWorkingDirectoryChange,
          }),
        ),
      );

      act(() =>
        result.current.handleValueChange(`${REPOSITORY_PREFIX}repo-42`),
      );

      expect(onRepositoryIdChange).toHaveBeenCalledWith('repo-42');
      expect(onCheckoutIdChange).toHaveBeenCalledWith('');
      expect(onWorkingDirectoryChange).toHaveBeenCalledWith('');
    });
  });

  describe('pre-fill effect', () => {
    test('defaults repositoryId when the project maps to exactly one repo with one checkout', () => {
      const onRepositoryIdChange = vi.fn();
      const repo1 = repository('repo-1', [checkout('c1', 'main')], 'project-1');

      renderHook(() =>
        usePlanWorkflowConfigWorkspaceSelector(
          baseOptions({
            onRepositoryIdChange,
            planProjectId: 'project-1',
            repositories: [repo1],
          }),
        ),
      );

      expect(onRepositoryIdChange).toHaveBeenCalledWith('repo-1');
    });

    test('does not pre-fill when the project has multiple repositories', () => {
      const onRepositoryIdChange = vi.fn();
      const repo1 = repository('repo-1', [checkout('c1', 'main')], 'project-1');
      const repo2 = repository('repo-2', [checkout('c2', 'main')], 'project-1');

      renderHook(() =>
        usePlanWorkflowConfigWorkspaceSelector(
          baseOptions({
            onRepositoryIdChange,
            planProjectId: 'project-1',
            repositories: [repo1, repo2],
          }),
        ),
      );

      expect(onRepositoryIdChange).not.toHaveBeenCalled();
    });

    test('does not pre-fill when the single matching repo has more than one checkout', () => {
      const onRepositoryIdChange = vi.fn();
      const repo1 = repository(
        'repo-1',
        [checkout('c1', 'main'), checkout('c2', 'feature')],
        'project-1',
      );

      renderHook(() =>
        usePlanWorkflowConfigWorkspaceSelector(
          baseOptions({
            onRepositoryIdChange,
            planProjectId: 'project-1',
            repositories: [repo1],
          }),
        ),
      );

      expect(onRepositoryIdChange).not.toHaveBeenCalled();
    });

    test('does not pre-fill when something is already selected', () => {
      const onRepositoryIdChange = vi.fn();
      const repo1 = repository('repo-1', [checkout('c1', 'main')], 'project-1');

      renderHook(() =>
        usePlanWorkflowConfigWorkspaceSelector(
          baseOptions({
            onRepositoryIdChange,
            planProjectId: 'project-1',
            repositories: [repo1],
            workingDirectory: '/already/set',
          }),
        ),
      );

      expect(onRepositoryIdChange).not.toHaveBeenCalled();
    });

    test('runs only once even if inputs change on rerender', () => {
      const onRepositoryIdChange = vi.fn();
      const repo1 = repository('repo-1', [checkout('c1', 'main')], 'project-1');

      const { rerender } = renderHook(
        (opts: PlanWorkflowConfigWorkspaceSelectorOptions) =>
          usePlanWorkflowConfigWorkspaceSelector(opts),
        {
          initialProps: baseOptions({
            onRepositoryIdChange,
            planProjectId: 'project-1',
            repositories: [repo1],
          }),
        },
      );

      expect(onRepositoryIdChange).toHaveBeenCalledTimes(1);

      rerender(
        baseOptions({
          onRepositoryIdChange,
          planProjectId: null,
          repositories: [],
        }),
      );

      expect(onRepositoryIdChange).toHaveBeenCalledTimes(1);
    });
  });
});
