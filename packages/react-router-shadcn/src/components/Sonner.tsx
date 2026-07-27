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
 * Toast entry points whose first argument is a display message. A message that
 * would render empty must never surface a toast — Sonner would otherwise show
 * an empty, bodyless toast (the bug this guards against). The non-message
 * methods (`promise`/`custom`/`dismiss`/`getToasts`/…) are left untouched;
 * genuine ReactNode messages still pass.
 */
const MESSAGE_METHODS = new Set([
  'error',
  'info',
  'loading',
  'message',
  'success',
  'warning',
]);

/**
 * A message renders only when it carries visible content: a non-whitespace
 * string, a numeric value React will print, or a React element. Everything
 * else — `null`/`undefined`, booleans, plain objects, functions, symbols — is
 * suppressed, so a nullish or non-ReactNode first arg can never surface a
 * bodyless toast (nor crash React on render). An allowlist (rather than a broad
 * `typeof !== 'string'` check) keeps real rich content untouched.
 */
const hasRenderableMessage = (args: readonly unknown[]): boolean => {
  const [message] = args;
  if (typeof message === 'string') {
    return message.trim().length > 0;
  }
  if (typeof message === 'number' || typeof message === 'bigint') {
    return true;
  }
  return React.isValidElement(message);
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

/**
 * Per-type toast surface colors, mirroring the shared Badge named-hue contract
 * (`border-{hue}-500/50 bg-{hue}-500/20`). Written as full literal class strings
 * so Tailwind's JIT can see and emit them — never build them dynamically. Sonner
 * applies each key only to toasts of that `data-type`, so `loading` and
 * `message`/`default` stay neutral (they keep the popover surface from
 * `toasterStyle`) because they are transient / non-status.
 *
 * Why the trailing `!` (important): Sonner paints the surface with an
 * *unlayered* rule — `[data-sonner-toast][data-styled='true'] { background:
 * var(--normal-bg); border: 1px solid var(--normal-border) }`. Tailwind v4 emits
 * every utility inside `@layer utilities`, and an unlayered declaration outranks
 * ANY layered one regardless of selector specificity — so a plain (or even a
 * more-specific, data-attribute-scoped) `bg-*` utility loses the cascade to
 * Sonner's var-driven paint. Specificity cannot win across layers; the important
 * flag can (an important declaration beats a normal unlayered one), so it is the
 * necessary override here, not a gratuitous one. We only override the color;
 * Sonner's `1px solid` border width/style still apply.
 */
const typedToastClassNames: NonNullable<
  NonNullable<ToasterProps['toastOptions']>['classNames']
> = {
  error: 'border-red-500/50! bg-red-500/20!',
  info: 'border-sky-500/50! bg-sky-500/20!',
  success: 'border-green-500/50! bg-green-500/20!',
  warning: 'border-amber-500/50! bg-amber-500/20!',
};

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
      toastOptions={{ classNames: typedToastClassNames }}
      {...props}
    />
  );
};

export { Toaster, toast };
