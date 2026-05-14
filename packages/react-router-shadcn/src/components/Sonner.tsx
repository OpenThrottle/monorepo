'use client';

import * as React from 'react';
import {
  CircleCheck,
  Info,
  LoaderCircle,
  OctagonX,
  TriangleAlert,
} from 'lucide-react';
import { Toaster as SonnerToaster } from 'sonner';

export { toast } from 'sonner';

export type ToasterProps = React.ComponentProps<typeof SonnerToaster>;

export const Toaster = (props: ToasterProps): React.ReactElement => {
  const { theme = 'system', ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <SonnerToaster
      className="toaster group"
      icons={{
        error: <OctagonX className="h-4 w-4 text-red-600" />,
        info: <Info className="h-4 w-4 text-blue-600" />,
        loading: <LoaderCircle className="h-4 w-4 text-accent animate-spin" />,
        success: <CircleCheck className="h-4 w-4 text-green-600" />,
        warning: <TriangleAlert className="h-4 w-4 text-yellow-600" />,
      }}
      theme={theme}
      toastOptions={{
        classNames: {
          actionButton: `group-[.toast]:bg-primary group-[.toast]:text-primary-foreground`,
          cancelButton: `group-[.toast]:bg-muted group-[.toast]:text-muted-foreground`,
          description: 'group-[.toast]:text-muted-foreground',
          toast: `group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg`,
        },
      }}
      {...rest}
    />
  );
};
