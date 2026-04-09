'use client';

import * as React from 'react';
import { Legend as RechartsLegend } from 'recharts';
import type { LegendProps as RechartsLegendProps } from 'recharts';

export interface ChartLegendProps extends RechartsLegendProps {}

/**
 * Recharts Legend wired to ChartLegendContent. Use inside a chart:
 * <ChartLegend content={<ChartLegendContent />} /> or <ChartLegend />.
 */
export const ChartLegend = (props: ChartLegendProps): React.ReactElement => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return <RechartsLegend {...props} />;
};

ChartLegend.displayName = 'ChartLegend';
