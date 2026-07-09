import * as React from 'react';
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Toaster as Sonner, toast, type ToasterProps } from 'sonner';

type ToasterTheme = NonNullable<ToasterProps['theme']>;

const isToasterTheme = (value: string): value is ToasterTheme =>
  value === 'dark' || value === 'light' || value === 'system';

const Toaster = ({ ...props }: ToasterProps): React.ReactElement => {
  const { theme = 'system' } = useTheme();

  const resolvedTheme: ToasterProps['theme'] = isToasterTheme(theme)
    ? theme
    : 'system';

  const toasterStyle: React.CSSProperties & Record<`--${string}`, string> = {
    '--border-radius': 'var(--radius)',
    '--normal-bg': 'var(--popover)',
    '--normal-border': 'var(--border)',
    '--normal-text': 'var(--popover-foreground)',
  };

  return (
    <Sonner
      className="toaster group"
      icons={{
        error: <OctagonXIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
        success: <CircleCheckIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
      }}
      style={toasterStyle}
      theme={resolvedTheme}
      {...props}
    />
  );
};

export { Toaster, toast };
