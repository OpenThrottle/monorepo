import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import TaskDetailRoute from '../plans.$planId.tasks.$taskId._index';

const mockTask = {
  __typename: 'TaskObject' as const,
  assignee: null,
  category: 'feature',
  createdAt: '2025-01-02T00:00:00Z',
  description: 'Task description',
  id: 'task-1',
  planId: 'plan-1',
  projectRelation: null,
  requirementsJson: '[]',
  sortOrder: 1000,
  status: 'PENDING',
  summary: null,
  tags: [
    {
      confidence: null,
      dimension: 'domain',
      id: 'tt-1',
      source: 'human',
      tag: 'backend',
    },
  ],
  title: 'A task',
  updatedAt: '2025-01-03T00:00:00Z',
};

const loaderData = {
  linkedArtifacts: [],
  plan: null,
  tagVocabulary: [
    { dimension: 'domain', id: 'v-1', tag: 'backend' },
    { dimension: 'phase', id: 'v-2', tag: 'design' },
  ],
  task: mockTask,
};

const renderRoute = (): {
  submitted: {
    intent: FormDataEntryValue | null;
    tag: FormDataEntryValue | null;
  }[];
} => {
  const submitted: {
    intent: FormDataEntryValue | null;
    tag: FormDataEntryValue | null;
  }[] = [];

  const RoutesStub = createRoutesStub([
    {
      Component: TaskDetailRoute,
      action: async ({ request }: { request: Request }) => {
        const formData = await request.formData();
        submitted.push({
          intent: formData.get('intent'),
          tag: formData.get('tag'),
        });
        return { taskTagUpdated: true };
      },
      loader: () => loaderData,
      path: '/plans/:planId/tasks/:taskId',
    },
  ]);

  render(<RoutesStub initialEntries={['/plans/plan-1/tasks/task-1']} />);
  return { submitted };
};

describe('routes/plans.$planId.tasks.$taskId._index.tsx — task tags', () => {
  test('renders existing task tags', async () => {
    renderRoute();
    expect(await screen.findByTestId('PlanTagChips')).toBeInTheDocument();
    expect(screen.getByText('backend')).toBeInTheDocument();
  });

  test('removing a tag submits the removeTaskTag intent', async () => {
    const user = userEvent.setup();
    const { submitted } = renderRoute();
    await user.click(
      await screen.findByRole('button', { name: 'Remove tag backend' }),
    );
    await waitFor(() => expect(submitted).toHaveLength(1));
    expect(submitted[0]).toEqual({ intent: 'removeTaskTag', tag: 'backend' });
  });

  test('adding a tag submits the addTaskTag intent', async () => {
    const user = userEvent.setup();
    const { submitted } = renderRoute();
    await user.selectOptions(
      await screen.findByRole('combobox', { name: 'Add a tag' }),
      'design',
    );
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(submitted).toHaveLength(1));
    expect(submitted[0]).toEqual({ intent: 'addTaskTag', tag: 'design' });
  });
});
