import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { QueueStateChartAxisTick } from '../QueueStateChartAxisTick';
import { QUEUE_STATE_CHART_LABEL_MAX_CHARS } from '~/routing/queues/utils/queue-state-chart';

const renderTick = (value: string) =>
  render(
    <svg>
      <QueueStateChartAxisTick payload={{ value }} x={100} y={20} />
    </svg>,
  );

describe('QueueStateChartAxisTick', () => {
  test('renders a short queue name in full on a single line', () => {
    const { container } = renderTick('Daily Stats');
    const text = container.querySelector('text');

    expect(text?.textContent).toBe('Daily Stats');
    expect(container.querySelectorAll('tspan')).toHaveLength(0);
  });

  test('truncates a long queue name with an ellipsis', () => {
    const { container } = renderTick('plan-lifecycle-hooks-extra-long');
    const text = container.querySelector('text');

    expect(text?.textContent).toHaveLength(QUEUE_STATE_CHART_LABEL_MAX_CHARS);
    expect(text?.textContent?.endsWith('…')).toBe(true);
  });

  test('renders empty text when payload is missing', () => {
    const { container } = render(
      <svg>
        <QueueStateChartAxisTick x={0} y={0} />
      </svg>,
    );

    expect(container.querySelector('text')?.textContent).toBe('');
  });
});
