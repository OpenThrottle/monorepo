import { Button } from '@openthrottle/react-router-shadcn';
import { ArrowRightIcon } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router';

import { GLOBAL_FEATURE_ONBOARDING_SECTION_COPY } from '../data/data.copy';
import { isExternalHref } from '../utils/external-href';
import type {
  GlobalFeatureOnboardingContent,
  GlobalFeatureOnboardingLink,
} from './GlobalFeatureOnboarding';

export interface GlobalFeatureOnboardingBodyProps {
  content: GlobalFeatureOnboardingContent;
}

/**
 * @description The section grid (What it is / How we use it internally / What you
 * could use it for / Quick start) plus the CTA row of a
 * {@link GlobalFeatureOnboarding} block. Extracted so the teaching markup is
 * single-sourced across the `'block'` and `'dialog'` render surfaces.
 */
export const GlobalFeatureOnboardingBody = (
  props: GlobalFeatureOnboardingBodyProps,
): React.ReactElement => {
  const { content } = props;
  const { cta, internalUsage, secondary, steps, useCases, whatItIs } = content;

  // Hooks

  // Setup

  // Handlers

  // Markup
  const hasCtas = cta != null || secondary != null;

  const renderCtaLink = (link: GlobalFeatureOnboardingLink) => {
    if (isExternalHref(link.to)) {
      return (
        <a href={link.to} rel="noreferrer" target="_blank">
          {link.label}
        </a>
      );
    }

    return <Link to={link.to}>{link.label}</Link>;
  };

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
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

      {/* CTAs — an absolute http(s) target renders as a plain new-tab anchor,
          anything else as a react-router `Link`. Both keep the Button styling
          via `asChild`. A feature with neither link emits no row at all. */}
      {hasCtas && (
        <div className="flex flex-wrap items-center gap-3">
          {cta != null && <Button asChild={true}>{renderCtaLink(cta)}</Button>}
          {secondary != null && (
            <Button asChild={true} variant="ghost">
              {renderCtaLink(secondary)}
            </Button>
          )}
        </div>
      )}
    </>
  );
};
