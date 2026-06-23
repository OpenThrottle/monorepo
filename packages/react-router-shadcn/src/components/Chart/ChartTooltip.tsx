'use client';

import * as React from 'react';
import { Tooltip as RechartsTooltip } from 'recharts';
import type { TooltipProps as RechartsTooltipProps } from 'recharts';

export interface ChartTooltipProps extends RechartsTooltipProps {}

/**
 * Recharts Tooltip wired to ChartTooltipContent. Use inside a chart: <ChartTooltip content={<ChartTooltipContent />} />.
 */
export const ChartTooltip = (props: ChartTooltipProps): React.ReactElement => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return <RechartsTooltip cursor={false} {...props} />;
};

ChartTooltip.displayName = 'ChartTooltip';
