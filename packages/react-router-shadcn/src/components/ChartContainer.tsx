'use client';

import * as React from 'react';
import { ResponsiveContainer } from 'recharts';
import { cn } from '../utils/cn';
import type { ChartConfig } from './chart-config';
import { ChartConfigContext } from './chart-config-context';

export interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly config: ChartConfig;
  readonly children: React.ReactNode;
}

/**
 * Wraps a Recharts chart and provides config via context and CSS variables (--color-{key}).
 * Set min-h-[value] for responsive height. Use with ResponsiveContainer or chart responsive prop.
 */
export const ChartContainer = ({
  config,
  className,
  children,
  style,
  ...props
}: ChartContainerProps): React.ReactElement => {
  // Hooks
  const varStyle = React.useMemo((): React.CSSProperties => {
    const cssVars: Record<string, string> = {};
    for (const key of Object.keys(config)) {
      const entry = config[key];
      const color = entry?.color ?? entry?.theme?.light;
      if (color) {
        cssVars[`--color-${key}`] = color;
      }
    }
    return { ...style, ...cssVars };
  }, [config, style]);

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <ChartConfigContext.Provider value={config}>
      <ResponsiveContainer
        className={cn('w-full h-full', className)}
        height="100%"
        style={varStyle}
        width="100%"
        {...props}
      >
        {children}
      </ResponsiveContainer>
    </ChartConfigContext.Provider>
  );
};
