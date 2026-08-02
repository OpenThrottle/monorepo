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
  type ToasterProps as SonnerToasterProps,
} from 'sonner';
import { isRenderableMessage } from '../utils/isRenderableMessage';

type ToasterTheme = NonNullable<SonnerToasterProps['theme']>;

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
 * A toast surfaces only when its first argument carries visible content, so a
 * nullish or non-ReactNode message can never surface a bodyless toast (nor crash
 * React on render). Delegates to the shared {@link isRenderableMessage} predicate
 * — the single source of truth also consumed by the in-app notifications store —
 * so both surfaces stay in lockstep.
 */
const hasRenderableMessage = (args: readonly unknown[]): boolean =>
  isRenderableMessage(args[0]);

/**
 * @public
 * @description Sonner's `toast`, wrapped so an empty/whitespace string message
 * no-ops app-wide instead of rendering an empty toast. A Proxy preserves the
 * callable and every method (including `promise`, `custom`, and `dismiss`)
 * without re-declaring the surface, and `new Proxy<T>` keeps the original type.
 */
export const toast: typeof sonnerToast = new Proxy(sonnerToast, {
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
  NonNullable<SonnerToasterProps['toastOptions']>['classNames']
> = {
  error: 'border-red-500/50! bg-card/80!',
  info: 'border-sky-500/50! bg-card/80!',
  success: 'border-green-500/50! bg-card/80!',
  warning: 'border-amber-500/50! bg-card/80!',
};

const isToasterTheme = (value: string): value is ToasterTheme =>
  value === 'dark' || value === 'light' || value === 'system';

export interface ToasterProps extends SonnerToasterProps {}

export const Toaster = React.forwardRef<
  React.ComponentRef<typeof Sonner>,
  ToasterProps
>((props, ref): React.ReactElement => {
  const { ...rest } = props;

  // Hooks
  const { theme = 'system' } = useTheme();

  // Setup
  const resolvedTheme: SonnerToasterProps['theme'] = isToasterTheme(theme)
    ? theme
    : 'system';

  const toasterStyle: React.CSSProperties & Record<`--${string}`, string> = {
    '--border-radius': 'var(--radius)',
    '--normal-bg': 'var(--popover)',
    '--normal-border': 'var(--border)',
    '--normal-text': 'var(--popover-foreground)',
  };

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Sonner
      className="toaster group"
      icons={{
        // Icon hue matches each type's surface (see `typedToastClassNames`) so
        // icon + tint read as one status. Full-strength `text-{hue}-500` — no
        // `!` needed: Sonner's `[data-icon]` rules set only layout, never color,
        // so a direct color on the svg simply overrides the inherited text
        // color. `loading` stays neutral (transient), matching its surface.
        error: <OctagonXIcon className="size-4 text-red-500" />,
        info: <InfoIcon className="size-4 text-sky-500" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
        success: <CircleCheckIcon className="size-4 text-green-500" />,
        warning: <TriangleAlertIcon className="size-4 text-amber-500" />,
      }}
      ref={ref}
      style={toasterStyle}
      theme={resolvedTheme}
      toastOptions={{ classNames: typedToastClassNames }}
      {...rest}
    />
  );
});

Toaster.displayName = 'Toaster';
