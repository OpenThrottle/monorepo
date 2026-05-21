'use client';

import * as React from 'react';
import type { VariantProps } from 'class-variance-authority';
import { toggleGroupItemVariants } from './toggleGroupItemVariants';

export type ToggleGroupContextValue = VariantProps<
  typeof toggleGroupItemVariants
>;

export const ToggleGroupContext = React.createContext<ToggleGroupContextValue>(
  {},
);
