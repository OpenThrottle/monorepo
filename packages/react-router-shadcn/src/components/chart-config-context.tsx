'use client';

import * as React from 'react';
import type { ChartConfig } from './chart-config';

export const ChartConfigContext = React.createContext<ChartConfig | undefined>(
  undefined,
);

export function useChartConfig(): ChartConfig | undefined {
  return React.useContext(ChartConfigContext);
}
