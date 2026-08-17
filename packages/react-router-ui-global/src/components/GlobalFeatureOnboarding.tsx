import * as React from 'react';
import clsx from 'clsx';
import {
  Card,
  CardContent,
  DialogDescription,
  DialogTitle,
} from '@openthrottle/react-router-shadcn';
import type { LucideIcon } from 'lucide-react';
import { GlobalFeatureOnboardingBody } from './GlobalFeatureOnboardingBody';

/**
 * @description How {@link GlobalFeatureOnboarding} renders itself: as a standalone
 * `Card` block (the empty-state pitch, default) or as dialog-native content (no
 * `Card` chrome, title/tagline via `DialogTitle`/`DialogDescription`) for use
 * inside a {@link GlobalFeatureOnboardingModal}.
 * @public
 */
export type GlobalFeatureOnboardingRenderAs = 'block' | 'dialog';

/**
 * @description A single call-to-action link used inside a
 * {@link GlobalFeatureOnboardingContent} block: a button/link label plus a
 * react-router `to` target.
 *
 * External targets are supported: an absolute `http(s)://` `to` renders as a
 * plain anchor opening in a new tab (`target="_blank" rel="noreferrer"`) rather
 * than a react-router `Link`, so a feature can point straight at upstream docs
 * or a spec. Anything else is treated as an in-app route.
 * @public
 */
export interface GlobalFeatureOnboardingLink {
  label: string;
  to: string;
}

/**
 * @description The typed copy contract every empty-page onboarding block conforms to.
 * `GlobalFeatureOnboarding` is purely presentational and renders whatever a feature
 * passes in here, so every "teach-me-fast" empty state reads as one consistent system.
 * Each feature supplies a copy object of this shape from its own `data/data.copy.ts`;
 * no feature-specific copy lives in the layout.
 * @public
 */
export interface GlobalFeatureOnboardingContent {
  /** Primary CTA — "Create your first ___". */
  cta: GlobalFeatureOnboardingLink;
  /** Lucide icon rendered in the eyebrow/title row. */
  icon: LucideIcon;
  /** "How we use it internally" — an authentic line on how the team uses it. */
  internalUsage: string;
  /** Optional secondary link (e.g. docs / learn more). */
  secondary?: GlobalFeatureOnboardingLink;
  /** Numbered "Quick start" steps, fastest path to a first win. */
  steps: string[];
  /** One-line hook shown under the title. */
  tagline: string;
  /** Feature name, e.g. "Rules". */
  title: string;
  /** "What you could use it for" — concrete, benefit-led use-cases. */
  useCases: string[];
  /** "What it is" — a plain-language definition of the feature. */
  whatItIs: string;
}

export interface GlobalFeatureOnboardingProps {
  className?: string;
  /** Typed, feature-supplied copy. The layout is purely presentational. */
  content: GlobalFeatureOnboardingContent;
  /**
   * Rendering surface. `'block'` (default) preserves the standalone `Card`
   * empty-state pitch; `'dialog'` drops the `Card` chrome and renders the
   * title/tagline via `DialogTitle`/`DialogDescription` for a
   * {@link GlobalFeatureOnboardingModal}.
   */
  renderAs?: GlobalFeatureOnboardingRenderAs;
}

/**
 * @description Shared presentational layout for a new-user "teach-me-fast"
 * onboarding block. Rendered on a genuinely-empty (empty AND unfiltered) list to
 * sell the feature by teaching it: what it is, what it's for, how we use it
 * internally, and the fastest path to a first win. Feature-specific wording is
 * single-sourced from each feature's copy object (see {@link GlobalFeatureOnboardingContent});
 * no feature copy lives here.
 * @public
 */
export const GlobalFeatureOnboarding = (
  props: GlobalFeatureOnboardingProps,
): React.ReactElement => {
  const { className, content, renderAs = 'block' } = props;
  const { icon: Icon, tagline, title } = content;
  const isDialog = renderAs === 'dialog';

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Eyebrow / title / tagline. In dialog mode the title/tagline use
  // `DialogTitle`/`DialogDescription` so Radix's accessible-title invariant is
  // met without a duplicate header; otherwise a plain `<h2>`/`<p>`.
  const header = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
          <Icon className="size-4" />
        </span>
        {isDialog ? (
          <DialogTitle className="text-lg tracking-tight">{title}</DialogTitle>
        ) : (
          <h2 className="text-lg tracking-tight">{title}</h2>
        )}
      </div>
      {isDialog ? (
        <DialogDescription className="text-muted-foreground text-base">
          {tagline}
        </DialogDescription>
      ) : (
        <p className="text-muted-foreground text-base">{tagline}</p>
      )}
    </div>
  );

  // Life Cycle

  // 🔌 Short Circuit

  // Dialog mode: the surrounding `Dialog` surface is already the card, so drop
  // the `Card`/`CardContent` chrome and render the same layout in a plain container.
  if (isDialog) {
    return (
      <div
        className={clsx('flex flex-col gap-8', className)}
        data-testid="GlobalFeatureOnboarding"
      >
        {header}
        <GlobalFeatureOnboardingBody content={content} />
      </div>
    );
  }

  return (
    <Card
      className={clsx('bg-card', className)}
      data-testid="GlobalFeatureOnboarding"
    >
      <CardContent className="flex flex-col gap-8 p-6 md:p-10">
        {header}
        <GlobalFeatureOnboardingBody content={content} />
      </CardContent>
    </Card>
  );
};
