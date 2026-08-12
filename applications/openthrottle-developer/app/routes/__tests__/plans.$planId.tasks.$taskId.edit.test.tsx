import * as React from 'react';
import { describe, expect, test } from 'vitest';
import Component from '../plans.$planId.tasks.$taskId.edit';
import { renderRoutesStub } from '~/testing/route-fixtures';
import type { GetTaskByIdQuery } from '~/__generated__/graphql';

function stubMatches(): React.ComponentProps<typeof Component>['matches'];
function stubMatches(): unknown {
  return [];
}

const buildTask = (
  overrides: Partial<NonNullable<GetTaskByIdQuery['task']>> = {},
): NonNullable<GetTaskByIdQuery['task']> => ({
  afterHooks: [],
  assignee: null,
  beforeHooks: [],
  category: null,
  createdAt: '2026-07-24T00:00:00.000Z',
  description: null,
  hookRole: null,
  id: 'task-1',
  planId: 'plan-1',
  projectRelation: null,
  requirementsJson: '[]',
  sortOrder: 0,
  status: 'PENDING',
  summary: null,
  tags: [],
  title: 'Original title',
  updatedAt: '2026-07-24T00:00:00.000Z',
  ...overrides,
});

describe('routes/plans.$planId.tasks.$taskId.edit.tsx', () => {
  test('renders the task form when the task exists', () => {
    const task = buildTask();

    const view = renderRoutesStub(
      <Component
        actionData={undefined}
        loaderData={{ task }}
        matches={stubMatches()}
        params={{ planId: 'plan-1', taskId: 'task-1' }}
      />,
    );

    expect(view.getByTestId('TaskForm')).toBeInTheDocument();
    expect(view.getByDisplayValue('Original title')).toBeInTheDocument();
  });

  test('renders the not-found state when the task is missing', () => {
    const view = renderRoutesStub(
      <Component
        actionData={undefined}
        loaderData={{ task: null }}
        matches={stubMatches()}
        params={{ planId: 'plan-1', taskId: 'missing' }}
      />,
    );

    expect(view.getByText('Task not found')).toBeInTheDocument();
  });
});
