import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { OutputStream } from '../OutputStream';
import type { OutputStreamProps } from '../OutputStream';

const renderStream = (props: OutputStreamProps): RenderResult =>
  render(<OutputStream {...props} />);

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
});
