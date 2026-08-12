import * as React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { ChartConfigContext, useChartConfig } from '../chart-config-context';

describe('chart-config-context', () => {
  test('useChartConfig returns undefined without a provider', () => {
    const { result } = renderHook(() => useChartConfig());
    expect(result.current).toBeUndefined();
  });

  test('useChartConfig returns the provided config', () => {
    const config = { sales: { label: 'Sales' } };
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ChartConfigContext.Provider value={config}>
        {children}
      </ChartConfigContext.Provider>
    );
    const { result } = renderHook(() => useChartConfig(), { wrapper });
    expect(result.current).toEqual(config);
  });
});
