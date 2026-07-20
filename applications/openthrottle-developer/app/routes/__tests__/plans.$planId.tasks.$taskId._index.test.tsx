import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import TaskDetailRoute from '../plans.$planId.tasks.$taskId._index';

const mockTask = {
  __typename: 'TaskObject' as const,
  afterHooks: [],
  assignee: null,
  beforeHooks: [],
  category: 'feature',
  createdAt: '2025-01-02T00:00:00Z',
  description: 'Task description',
  hookRole: null,
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

  render(
    <TooltipProvider>
      <RoutesStub initialEntries={['/plans/plan-1/tasks/task-1']} />
    </TooltipProvider>,
  );
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

describe('routes/plans.$planId.tasks.$taskId._index.tsx — task lifecycle hooks', () => {
  const renderWithHook = (): {
    submitted: Record<string, FormDataEntryValue | null>[];
  } => {
    const submitted: Record<string, FormDataEntryValue | null>[] = [];
    const taskWithHook = {
      ...mockTask,
      beforeHooks: [
        {
          hookRole: 'before',
          hookScope: 'once',
          hookSource: 'skill',
          id: 'hook-9',
          skillSlug: 'seed-db',
          status: 'PENDING',
          title: 'before: /seed-db',
        },
      ],
    };

    const RoutesStub = createRoutesStub([
      {
        Component: TaskDetailRoute,
        action: async ({ request }: { request: Request }) => {
          const formData = await request.formData();
          submitted.push(Object.fromEntries(formData.entries()));
          return { detachHook: true };
        },
        loader: () => ({ ...loaderData, task: taskWithHook }),
        path: '/plans/:planId/tasks/:taskId',
      },
    ]);

    render(
      <TooltipProvider>
        <RoutesStub initialEntries={['/plans/plan-1/tasks/task-1']} />
      </TooltipProvider>,
    );
    return { submitted };
  };

  test('renders the task hooks section with its before-hook', async () => {
    renderWithHook();
    expect(await screen.findByText('Task hooks')).toBeInTheDocument();
    expect(screen.getByText('before: /seed-db')).toBeInTheDocument();
  });

  test('removing a task hook submits the detachHook intent', async () => {
    const user = userEvent.setup();
    const { submitted } = renderWithHook();
    await user.click(
      await screen.findByRole('button', {
        name: 'Remove hook: before: /seed-db',
      }),
    );
    await waitFor(() => expect(submitted).toHaveLength(1));
    expect(submitted[0]).toEqual({
      hookTaskId: 'hook-9',
      intent: 'detachHook',
    });
  });
});
