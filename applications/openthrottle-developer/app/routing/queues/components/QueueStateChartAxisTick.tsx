import * as React from 'react';
import { truncateQueueLabel } from '~/routing/queues/utils/queue-state-chart';

export interface QueueStateChartAxisTickProps {
  payload?: { value?: number | string };
  x?: number;
  y?: number;
}

/**
 * @description Custom category-axis tick for QueueStateChart. Renders a plain,
 * single-line SVG label (no recharts width-based wrapping/over-truncation);
 * long queue names are clipped with an ellipsis, full name stays in the tooltip.
 */
export const QueueStateChartAxisTick = (
  props: QueueStateChartAxisTickProps,
): React.ReactElement => {
  const { payload, x = 0, y = 0 } = props;

  // Hooks

  // Setup
  const value = payload?.value == null ? '' : String(payload.value);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  return (
    <text
      className="fill-muted-foreground"
      dy="0.32em"
      fontSize={12}
      textAnchor="end"
      x={x}
      y={y}
    >
      {truncateQueueLabel(value)}
    </text>
  );
};

QueueStateChartAxisTick.displayName = 'QueueStateChartAxisTick';
