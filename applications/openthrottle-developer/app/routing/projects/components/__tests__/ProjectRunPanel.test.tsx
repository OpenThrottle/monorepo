import type { RenderResult } from '@testing-library/react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import {
  PROJECT_RUN_COPY,
  PROJECT_RUN_STATE_LABEL,
} from '~/routing/projects/data/data.copy';

import type { ProjectRunPanelProps } from '../ProjectRunPanel';
import { ProjectRunPanel } from '../ProjectRunPanel';

type Run = NonNullable<ProjectRunPanelProps['run']>;

const plan = (id: string, title: string): NonNullable<Run['currentPlan']> => {
  return { __typename: 'PlanObject', id, title };
};

const run = (overrides: Partial<Run>): Run => {
  return {
    __typename: 'ProjectRunObject',
    cancelRequestedAt: null,
    currentPlan: null,
    id: 'run-1',
    settledAt: null,
    status: 'IN_PROGRESS',
    stoppedByPlan: null,
    stoppedReason: null,
    ...overrides,
  };
};

describe('ProjectRunPanel Component', () => {
  let component: RenderResult;
  let submitted: Record<string, FormDataEntryValue | null>[];
  let actionResult: Record<string, unknown>;

  const renderPanel = (props: ProjectRunPanelProps): void => {
    const Component = () => {
      return <ProjectRunPanel {...props} />;
    };
    const RoutesStub = createRoutesStub([
      {
        Component,
        action: async ({ request }: { request: Request }) => {
          const formData = await request.formData();
          submitted.push({
            intent: formData.get('intent'),
            projectRunId: formData.get('projectRunId'),
          });
          return actionResult;
        },
        path: '/',
      },
    ]);
    component = render(<RoutesStub />);
  };

  const stateBadge = (): string | null => {
    return component.getByTestId('ProjectRunState').textContent;
  };

  beforeEach(() => {
    submitted = [];
    actionResult = { projectRunUpdated: true };
  });

  describe('when the project has never run', () => {
    beforeEach(() => {
      renderPanel({ run: null });
    });

    test('offers Run project, which posts the runProject intent', async () => {
      expect(stateBadge()).toBe(PROJECT_RUN_STATE_LABEL.idle);

      await userEvent.click(
        component.getByRole('button', { name: PROJECT_RUN_COPY.run }),
      );

      await waitFor(() => {
        expect(submitted).toEqual([
          { intent: 'runProject', projectRunId: null },
        ]);
      });
    });
  });

  describe('when a run is active', () => {
    test('names the current plan and offers Cancel for that run', async () => {
      renderPanel({
        run: run({ currentPlan: plan('plan-2', 'Second plan') }),
      });

      expect(stateBadge()).toBe(PROJECT_RUN_STATE_LABEL.running);
      expect(
        component.getByRole('link', { name: 'Second plan' }),
      ).toHaveAttribute('href', '/plans/plan-2');
      expect(
        component.queryByRole('button', { name: PROJECT_RUN_COPY.run }),
      ).not.toBeInTheDocument();

      await userEvent.click(
        component.getByRole('button', { name: PROJECT_RUN_COPY.cancel }),
      );

      await waitFor(() => {
        expect(submitted).toEqual([
          { intent: 'cancelProjectRun', projectRunId: 'run-1' },
        ]);
      });
    });

    test('disables Cancel once a cancel was requested', () => {
      renderPanel({ run: run({ cancelRequestedAt: '2026-11-22T00:00:00Z' }) });

      expect(
        component.getByRole('button', { name: PROJECT_RUN_COPY.cancelling }),
      ).toBeDisabled();
    });
  });

  describe('when the run stopped', () => {
    beforeEach(() => {
      renderPanel({
        run: run({
          status: 'STOPPED',
          stoppedByPlan: plan('plan-2', 'Second plan'),
          stoppedReason: 'Plan run r settled FAILED.',
        }),
      });
    });

    test('names the stopping plan and reason, and offers Resume', async () => {
      expect(stateBadge()).toBe(PROJECT_RUN_STATE_LABEL.stopped);
      expect(
        component.getByRole('link', { name: 'Second plan' }),
      ).toHaveAttribute('href', '/plans/plan-2');
      expect(
        component.getByText(/Plan run r settled FAILED\./),
      ).toBeInTheDocument();

      await userEvent.click(
        component.getByRole('button', { name: PROJECT_RUN_COPY.resume }),
      );

      await waitFor(() => {
        expect(submitted).toEqual([
          { intent: 'runProject', projectRunId: null },
        ]);
      });
    });
  });

  describe('when the run was cancelled', () => {
    test('says so and offers a fresh run', () => {
      renderPanel({ run: run({ status: 'CANCELLED' }) });

      expect(stateBadge()).toBe(PROJECT_RUN_STATE_LABEL.cancelled);
      expect(
        component.getByRole('button', { name: PROJECT_RUN_COPY.run }),
      ).toBeEnabled();
    });
  });

  describe('when the run completed', () => {
    test('says so and offers a fresh run', () => {
      renderPanel({ run: run({ status: 'COMPLETED' }) });

      expect(stateBadge()).toBe(PROJECT_RUN_STATE_LABEL.completed);
      expect(
        component.getByRole('button', { name: PROJECT_RUN_COPY.run }),
      ).toBeEnabled();
    });
  });

  describe('when the server refuses the run', () => {
    test('shows the refusal', async () => {
      actionResult = {
        projectRunError: 'This project already has an active run.',
      };
      renderPanel({ run: null });

      await userEvent.click(
        component.getByRole('button', { name: PROJECT_RUN_COPY.run }),
      );

      expect(await component.findByRole('alert')).toHaveTextContent(
        'This project already has an active run.',
      );
    });
  });
});
