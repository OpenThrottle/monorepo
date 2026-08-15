import * as React from 'react';
import clsx from 'clsx';
import { Button, Card, CardContent } from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import { ArrowRightIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { GLOBAL_FEATURE_ONBOARDING_SECTION_COPY } from '../data/data.copy';

/**
 * @description A single call-to-action link used inside a
 * {@link GlobalFeatureOnboardingContent} block: a button/link label plus a
 * react-router `to` target.
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
  const { className, content } = props;

  // Hooks

  // Setup
  const {
    cta,
    icon: Icon,
    internalUsage,
    secondary,
    steps,
    tagline,
    title,
    useCases,
    whatItIs,
  } = content;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card
      className={clsx('bg-card', className)}
      data-testid="GlobalFeatureOnboarding"
    >
      <CardContent className="flex flex-col gap-8 p-6 md:p-10">
        {/* Eyebrow / title / tagline */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
              <Icon className="size-4" />
            </span>
            <h2 className="text-lg tracking-tight">{title}</h2>
          </div>
          <p className="text-muted-foreground text-base">{tagline}</p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* What it is */}
          <section className="flex flex-col gap-2">
            <h3 className="text-foreground text-sm font-semibold">
              {GLOBAL_FEATURE_ONBOARDING_SECTION_COPY.whatItIs}
            </h3>
            <p className="text-muted-foreground text-sm/relaxed">{whatItIs}</p>
          </section>

          {/* How we use it internally */}
          <section className="flex flex-col gap-2">
            <h3 className="text-foreground text-sm font-semibold">
              {GLOBAL_FEATURE_ONBOARDING_SECTION_COPY.internalUsage}
            </h3>
            <p className="text-muted-foreground text-sm/relaxed">
              {internalUsage}
            </p>
          </section>

          {/* What you could use it for */}
          <section className="flex flex-col gap-2">
            <h3 className="text-foreground text-sm font-semibold">
              {GLOBAL_FEATURE_ONBOARDING_SECTION_COPY.useCases}
            </h3>
            <ul className="text-muted-foreground flex flex-col gap-1.5 text-sm/relaxed">
              {useCases.map((useCase) => (
                <li className="flex items-start gap-2" key={useCase}>
                  <ArrowRightIcon className="text-muted-foreground mt-1 size-3.5 shrink-0" />
                  <span>{useCase}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Quick start */}
          <section className="flex flex-col gap-2">
            <h3 className="text-foreground text-sm font-semibold">
              {GLOBAL_FEATURE_ONBOARDING_SECTION_COPY.steps}
            </h3>
            <ol className="text-muted-foreground flex flex-col gap-1.5 text-sm/relaxed">
              {steps.map((step, index) => (
                <li className="flex items-start gap-2.5" key={step}>
                  <span className="bg-muted text-foreground mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-medium">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* CTAs */}
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild={true}>
            <Link to={cta.to}>{cta.label}</Link>
          </Button>
          {secondary != null ? (
            <Button asChild={true} variant="ghost">
              <Link to={secondary.to}>{secondary.label}</Link>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};
