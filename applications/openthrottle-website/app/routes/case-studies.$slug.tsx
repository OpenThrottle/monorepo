import * as React from 'react';
import { Link } from 'react-router';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { SITE_TITLE } from '~/global/config/settings';
import { MOCK_CASE_STUDIES } from '~/routing/case-studies/data/mock.case-studies';
import type { Route } from '@/app/routes/+types/case-studies.$slug';

export const loader = async (args: Route.LoaderArgs) => {
  const { params } = args;
  const slug = params.slug;
  const caseStudy = MOCK_CASE_STUDIES.find((c) => c.slug === slug);
  if (!caseStudy) {
    throw new Response('Not Found', { status: 404 });
  }
  return { caseStudy };
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((args) => {
  const title = args.data?.caseStudy?.title;
  return [
    {
      title: title
        ? `${title} | Case Studies | ${SITE_TITLE}`
        : `Case Studies | ${SITE_TITLE}`,
    },
  ];
});

export default function CaseStudySlug(props: Route.ComponentProps) {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;

  // Hooks

  // Setup
  const caseStudy = loaderData?.caseStudy;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  if (!caseStudy) return null;

  return (
    <main className="relative h-full">
      <section
        className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border bg-card/30"
        data-testid="CaseStudyDetailSection"
      >
        <div className="max-w-3xl mx-auto">
          <Link
            className="text-muted-foreground hover:text-foreground mb-6 inline-block text-sm"
            to="/case-studies"
          >
            ← Case Studies
          </Link>
          <h1 className="text-3xl font-bold mb-2">{caseStudy.title}</h1>
          <p className="text-muted-foreground mb-8">
            {caseStudy.company}
            {caseStudy.tags && caseStudy.tags.length > 0 && (
              <span className="ml-2">· {caseStudy.tags.join(', ')}</span>
            )}
          </p>
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <p className="text-muted-foreground whitespace-pre-wrap">
              {caseStudy.body}
            </p>
          </div>
          {caseStudy.metrics && caseStudy.metrics.length > 0 && (
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {caseStudy.metrics.map((m) => (
                <div
                  className="rounded-lg border border-border bg-card p-4"
                  key={m.label}
                >
                  <div className="text-2xl font-bold">{m.value}</div>
                  <div className="text-sm text-muted-foreground">{m.label}</div>
                </div>
              ))}
            </div>
          )}
          {caseStudy.testimonial && (
            <blockquote className="mt-10 border-l-4 border-primary pl-6 italic text-muted-foreground">
              <p>"{caseStudy.testimonial.quote}"</p>
              <footer className="mt-2 not-italic">
                — {caseStudy.testimonial.author}
                {caseStudy.testimonial.role &&
                  `, ${caseStudy.testimonial.role}`}
                {caseStudy.testimonial.company &&
                  ` at ${caseStudy.testimonial.company}`}
              </footer>
            </blockquote>
          )}
          {caseStudy.ctaUrl && caseStudy.ctaLabel && (
            <div className="mt-10">
              <Link
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                to={caseStudy.ctaUrl}
              >
                {caseStudy.ctaLabel}
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export const ErrorBoundary = GlobalErrorBoundary;
