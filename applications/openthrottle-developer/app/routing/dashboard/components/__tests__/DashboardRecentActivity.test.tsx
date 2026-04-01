import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { DashboardRecentActivity } from '../DashboardRecentActivity';
import type { DashboardRecentActivityProps } from '../DashboardRecentActivity';

function renderWithProps(props: DashboardRecentActivityProps): RenderResult {
  const Component = () => <DashboardRecentActivity {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
}

describe('DashboardRecentActivity Component', () => {
  let component: RenderResult;
  let props: DashboardRecentActivityProps;

  beforeEach(() => {
    props = {
      data: {
        commits: [],
        hasNext: false,
        outputChunks: [],
        tasksUpdated: [],
        totalCount: 0,
      },
    };

    component = renderWithProps(props);
  });

  describe('commit row links', () => {
    test('commit with planId only renders link to plan detail', () => {
      const planId = 'plan-abc-123';
      props = {
        data: {
          commits: [
            {
              createdAt: '2025-02-11T12:00:00Z',
              id: 'c1',
              message: 'feat: add thing',
              planId,
              planTitle: 'My Plan',
              repo: 'owner/repo',
              sha: 'abc123',
              taskId: null,
              taskTitle: null,
            },
          ],
          hasNext: false,
          outputChunks: [],
          tasksUpdated: [],
          totalCount: 1,
        },
      };
      component = renderWithProps(props);
      const links = component.getAllByRole('link');
      expect(links.length).toBeGreaterThanOrEqual(1);
      const planLink = links.find(
        (el) => el.getAttribute('href') === `/plans/${planId}`,
      );
      expect(planLink).toBeDefined();
    });

    test('commit with planId and taskId renders link to task detail', () => {
      const planId = 'plan-def-456';
      const taskId = 'task-xyz-789';
      props = {
        data: {
          commits: [
            {
              createdAt: '2025-02-11T13:00:00Z',
              id: 'c2',
              message: 'fix: thing',
              planId,
              planTitle: 'Other Plan',
              repo: 'owner/repo',
              sha: 'def456',
              taskId,
              taskTitle: 'Do the thing',
            },
          ],
          hasNext: false,
          outputChunks: [],
          tasksUpdated: [],
          totalCount: 1,
        },
      };
      component = renderWithProps(props);
      const links = component.getAllByRole('link');
      expect(links.length).toBeGreaterThanOrEqual(1);
      const taskLink = links.find(
        (el) => el.getAttribute('href') === `/plans/${planId}#task-${taskId}`,
      );
      expect(taskLink).toBeDefined();
    });
  });

  describe('task-updated row links', () => {
    test('task row renders link to task detail with correct planId and taskId', () => {
      const planId = 'plan-ghi-000';
      const taskId = 'task-task-111';
      props = {
        data: {
          commits: [],
          hasNext: false,
          outputChunks: [],
          tasksUpdated: [
            {
              id: taskId,
              planId,
              planTitle: 'Task Plan',
              status: 'COMPLETED',
              title: 'Completed task',
              updatedAt: '2025-02-11T14:00:00Z',
            },
          ],
          totalCount: 1,
        },
      };
      component = renderWithProps(props);
      const links = component.getAllByRole('link');
      expect(links.length).toBeGreaterThanOrEqual(1);
      const taskLink = links.find(
        (el) => el.getAttribute('href') === `/plans/${planId}#task-${taskId}`,
      );
      expect(taskLink).toBeDefined();
    });
  });

  describe('output chunk row links', () => {
    test('output chunk row renders link to plan detail', () => {
      const planId = 'plan-out-222';
      props = {
        data: {
          commits: [],
          hasNext: false,
          outputChunks: [
            {
              content: 'Some output content',
              createdAt: '2025-02-11T15:00:00Z',
              id: 'out-1',
              iteration: 1,
              planId,
              planTitle: 'Output Plan',
            },
          ],
          tasksUpdated: [],
          totalCount: 1,
        },
      };
      component = renderWithProps(props);
      const links = component.getAllByRole('link');
      expect(links.length).toBeGreaterThanOrEqual(1);
      const planLink = links.find(
        (el) => el.getAttribute('href') === `/plans/${planId}`,
      );
      expect(planLink).toBeDefined();
    });
  });
});
