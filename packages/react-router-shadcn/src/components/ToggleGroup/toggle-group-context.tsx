'use client';

import type { VariantProps } from 'class-variance-authority';
import * as React from 'react';

import type { toggleGroupItemVariants } from './toggleGroupItemVariants';

export type ToggleGroupContextValue = VariantProps<
  typeof toggleGroupItemVariants
>;

export const ToggleGroupContext = React.createContext<ToggleGroupContextValue>(
  {},
);
