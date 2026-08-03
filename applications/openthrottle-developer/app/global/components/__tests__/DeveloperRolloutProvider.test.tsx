import * as React from 'react';
import { render, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import {
  clearRolloutEvaluationMemoryCache,
  type RolloutEvaluation,
} from '@openthrottle/react-router-rollout';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { DeveloperRolloutProvider } from '../DeveloperRolloutProvider';
import type { DeveloperRolloutProviderProps } from '../DeveloperRolloutProvider';
import { ROLLOUT_ANONYMOUS_ID_STORAGE_KEY } from '~/global/utils/rollout-anonymous-id';

const fetchRolloutEvaluationsMock = vi.hoisted(() =>
  vi.fn(async (): Promise<readonly RolloutEvaluation[]> => []),
);

vi.mock('~/global/utils/fetch-rollout-evaluations', () => ({
  fetchRolloutEvaluations: fetchRolloutEvaluationsMock,
}));

describe('DeveloperRolloutProvider Component', () => {
  let component: RenderResult;
  let props: DeveloperRolloutProviderProps;

  beforeEach(() => {
    clearRolloutEvaluationMemoryCache();
    fetchRolloutEvaluationsMock.mockReset();
    fetchRolloutEvaluationsMock.mockResolvedValue([]);
    window.localStorage.clear();
    window.sessionStorage.clear();

    props = {
      children: <div data-testid="DeveloperRolloutProviderChild" />,
      identityKey: null,
    };

    const Component = () => <DeveloperRolloutProvider {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders children and hydrates with applicationKey', async () => {
    expect(
      component.getByTestId('DeveloperRolloutProviderChild'),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchRolloutEvaluationsMock).toHaveBeenCalled();
    });

    expect(fetchRolloutEvaluationsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        applicationKey: 'openthrottle-developer',
      }),
    );
    expect(
      window.localStorage.getItem(ROLLOUT_ANONYMOUS_ID_STORAGE_KEY),
    ).toEqual(expect.any(String));
  });
});
