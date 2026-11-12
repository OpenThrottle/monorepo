import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { OUTPUT_STREAM_COPY } from '~/routing/plans/data/data.copy';

import type { OutputStreamProps } from '../OutputStream';
import { OutputStream } from '../OutputStream';

const renderStream = (props: OutputStreamProps): RenderResult => {
  return render(<OutputStream {...props} />);
};

describe('OutputStream Component', () => {
  test('renders one compact time per chunk and keeps the full timestamp on hover', async () => {
    const component = renderStream({
      chunks: [
        {
          content: 'Committed 4f2a1c8 feat(atlas-api): add a token bucket',
          createdAt: new Date(2026, 7, 19, 13, 16, 45),
          id: 'chunk-1',
          iteration: 1,
        },
      ],
    });

    const time = component.getByText('13:16:45');

    expect(time).toHaveAttribute('title', 'Aug 19, 2026 at 1:16:45 PM');
    expect(time.tagName).toBe('TIME');
    expect(component.getByText('#1')).toBeInTheDocument();
    expect(await component.findByText(/Committed 4f2a1c8/)).toBeInTheDocument();

    // The verbose JS Date string must not reach the DOM.
    expect(component.container.textContent).not.toContain('GMT');
  });

  test('renders the calendar day once per run of same-day chunks', () => {
    const component = renderStream({
      chunks: [
        {
          content: 'first',
          createdAt: new Date(2026, 7, 19, 9, 0, 0),
          id: 'chunk-1',
          iteration: 1,
        },
        {
          content: 'second',
          createdAt: new Date(2026, 7, 19, 13, 16, 45),
          id: 'chunk-2',
          iteration: 2,
        },
        {
          content: 'third',
          createdAt: new Date(2026, 7, 20, 8, 0, 0),
          id: 'chunk-3',
          iteration: 3,
        },
      ],
    });

    expect(component.getAllByText('Wed, Aug 19, 2026')).toHaveLength(1);
    expect(component.getAllByText('Thu, Aug 20, 2026')).toHaveLength(1);
  });

  test('renders a chunk without an iteration or a usable timestamp', () => {
    const component = renderStream({
      chunks: [
        { content: 'orphan', createdAt: null, id: 'chunk-1', iteration: null },
      ],
    });

    expect(component.getByText('Unknown date')).toBeInTheDocument();
    expect(component.container.textContent).not.toContain('#');
    expect(component.container.textContent).not.toContain('Invalid Date');
  });

  describe('task-tagged output', () => {
    const taskChunks: OutputStreamProps['chunks'] = [
      {
        content: 'line one\n  indented line two',
        createdAt: new Date(2026, 7, 19, 13, 0, 0),
        id: 'chunk-1',
        taskId: 'task-aaaa-1111',
      },
      {
        content: 'more from the same task',
        createdAt: new Date(2026, 7, 19, 13, 0, 1),
        id: 'chunk-2',
        taskId: 'task-aaaa-1111',
      },
      {
        content: 'validation output',
        createdAt: new Date(2026, 7, 19, 13, 0, 2),
        id: 'chunk-3',
        taskId: 'task-bbbb-2222',
      },
    ];

    test('renders raw text verbatim in monospace, in order', () => {
      const component = renderStream({ chunks: taskChunks });

      const blocks = component.container.querySelectorAll('pre');

      expect(blocks).toHaveLength(3);
      expect([...blocks].map((block) => block.textContent)).toEqual([
        'line one\n  indented line two',
        'more from the same task',
        'validation output',
      ]);
      expect(blocks[0]).toHaveClass('font-mono', 'whitespace-pre-wrap');
    });

    test('names each task once where its output starts, using titles when known', () => {
      const component = renderStream({
        chunks: taskChunks,
        taskTitles: new Map([['task-aaaa-1111', 'Add the runner field']]),
      });

      const labels = component.getAllByTestId('OutputStream-task');

      expect(labels).toHaveLength(2);
      expect(labels[0]).toHaveTextContent(
        OUTPUT_STREAM_COPY.taskLabel('Add the runner field'),
      );
      expect(labels[1]).toHaveTextContent(
        OUTPUT_STREAM_COPY.taskLabel('task-bbb'),
      );
    });

    test('plan-scoped chunks still render as Markdown without a task label', async () => {
      const component = renderStream({
        chunks: [
          {
            content: 'plain **bold**',
            createdAt: new Date(2026, 7, 19, 13, 0, 0),
            id: 'chunk-9',
          },
        ],
      });

      expect(await component.findByText('bold')).toBeInTheDocument();
      expect(component.container.querySelector('pre')).toBeNull();
      expect(component.queryByTestId('OutputStream-task')).toBeNull();
    });
  });
});
