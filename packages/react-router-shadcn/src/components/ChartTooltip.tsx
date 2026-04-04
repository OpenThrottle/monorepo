'use client';

import * as React from 'react';
import { Tooltip as RechartsTooltip } from 'recharts';

export interface ChartTooltipProps {
  readonly content?: React.ReactElement;
  readonly children?: never;
}

/**
 * Recharts Tooltip wired to ChartTooltipContent. Use inside a chart: <ChartTooltip content={<ChartTooltipContent />} />.
 */
export function ChartTooltip({
  content,
  ...props
}: ChartTooltipProps &
  React.ComponentProps<typeof RechartsTooltip>): React.ReactElement {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return <RechartsTooltip {...props} content={content} />;
}
