'use client';

import * as React from 'react';
import { Legend as RechartsLegend } from 'recharts';

export interface ChartLegendProps {
  readonly content?: React.ReactElement;
  readonly children?: never;
}

/**
 * Recharts Legend wired to ChartLegendContent. Use inside a chart: <ChartLegend content={<ChartLegendContent />} />.
 */
export function ChartLegend({
  content,
  ...props
}: ChartLegendProps &
  React.ComponentProps<typeof RechartsLegend>): React.ReactElement {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return <RechartsLegend {...props} content={content} />;
}
