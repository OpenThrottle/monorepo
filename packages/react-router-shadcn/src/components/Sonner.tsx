import * as React from 'react';
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import {
  Toaster as Sonner,
  toast as sonnerToast,
  type ToasterProps,
} from 'sonner';

type ToasterTheme = NonNullable<ToasterProps['theme']>;

/**
 * Toast entry points whose first argument is a display message. An empty or
 * whitespace-only string message must never surface a toast — Sonner would
 * otherwise render an empty, bodyless toast (the bug this guards against). The
 * non-message methods (`promise`/`custom`/`dismiss`/`getToasts`/…) are left
 * untouched, as are ReactNode messages.
 */
const MESSAGE_METHODS = new Set([
  'error',
  'info',
  'loading',
  'message',
  'success',
  'warning',
]);

/** A string message renders only when it has non-whitespace content. */
const hasRenderableMessage = (args: readonly unknown[]): boolean => {
  const [message] = args;
  return typeof message !== 'string' || message.trim().length > 0;
};

/**
 * @public
 * @description Sonner's `toast`, wrapped so an empty/whitespace string message
 * no-ops app-wide instead of rendering an empty toast. A Proxy preserves the
 * callable and every method (including `promise`, `custom`, and `dismiss`)
 * without re-declaring the surface, and `new Proxy<T>` keeps the original type.
 */
const toast: typeof sonnerToast = new Proxy(sonnerToast, {
  apply(target, thisArg: unknown, args: unknown[]): unknown {
    return hasRenderableMessage(args)
      ? Reflect.apply(target, thisArg, args)
      : undefined;
  },
  get(target, property, receiver): unknown {
    const value = Reflect.get(target, property, receiver);
    if (
      typeof value === 'function' &&
      typeof property === 'string' &&
      MESSAGE_METHODS.has(property)
    ) {
      return (...args: unknown[]): unknown =>
        hasRenderableMessage(args)
          ? Reflect.apply(value, target, args)
          : undefined;
    }
    return value;
  },
});

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
