import * as React from 'react';
import type { RenderResult } from '@testing-library/react';
import { Tabs } from '@openthrottle/react-router-shadcn';
import { beforeEach, describe, expect, test } from 'vitest';
import { TaskTabOutput } from '../TaskTabOutput';
import type { TaskTabOutputProps } from '../TaskTabOutput';
import type { TaskOutputStreamChunksQuery } from '~/__generated__/graphql';
import { renderRoutesStub } from '~/testing/route-fixtures';

type Chunk = TaskOutputStreamChunksQuery['planOutputStreamChunks'][number];

const chunk = (overrides: Partial<Chunk>): Chunk => ({
  __typename: 'PlanOutputStreamChunkObject',
  content: 'Chunk content',
  createdAt: '2026-02-01T22:00:00.000Z',
  id: 'chunk-1',
  iteration: 1,
  planId: 'plan-1',
  taskId: 'task-1',
  ...overrides,
});

const renderTab = (props: TaskTabOutputProps): RenderResult =>
  // TabsContent must render inside a Tabs context with the matching value active.
  renderRoutesStub(
    <Tabs defaultValue="output">
      <TaskTabOutput {...props} />
    </Tabs>,
  );

describe('TaskTabOutput Component', () => {
  test('renders the empty state and plan-output link when there are no chunks', () => {
    const component = renderTab({ chunks: [], planId: 'plan-1' });

    expect(component.getByText('No task output yet')).toBeInTheDocument();
    const link = component.getByRole('link', {
      name: /view full plan output/i,
    });
    expect(link).toHaveAttribute('href', '/plans/plan-1?tab=output');
  });

  describe('with chunks', () => {
    let component: RenderResult;

    beforeEach(() => {
      component = renderTab({
        chunks: [
          chunk({ content: 'First task log', id: 'c1', iteration: 1 }),
          chunk({ content: 'Second task log', id: 'c2', iteration: 2 }),
        ],
        planId: 'plan-1',
      });
    });

    test('renders the chunk content and no empty state', async () => {
      expect(await component.findByText('First task log')).toBeInTheDocument();
      expect(component.getByText('Second task log')).toBeInTheDocument();
      expect(
        component.queryByText('No task output yet'),
      ).not.toBeInTheDocument();
    });

    test('keeps the "View full plan output" affordance', () => {
      expect(
        component.getByRole('link', { name: /view full plan output/i }),
      ).toBeInTheDocument();
    });
  });
});
