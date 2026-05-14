import * as React from 'react';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import { CaseStudyList } from '~/routing/case-studies/components/CaseStudyList';
import { MOCK_CASE_STUDY_LIST_ITEMS } from '~/routing/case-studies/data/mock.case-studies';
import type { Route } from '@/app/routes/+types/case-studies._index';

export const loader = async (_args: Route.LoaderArgs) => {
  return { caseStudies: MOCK_CASE_STUDY_LIST_ITEMS };
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Case Studies | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;

  // Hooks

  // Setup
  const caseStudies = loaderData?.caseStudies ?? [];

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <main className="relative h-full">
      <section
        className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border bg-card/30"
        data-testid="CaseStudiesSection"
      >
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-4 text-center">Case Studies</h1>
          <p className="text-lg text-muted-foreground text-center mb-12 max-w-xl mx-auto">
            See how teams use OpenThrottle to ship faster and stay aligned.
          </p>
          <CaseStudyList caseStudies={caseStudies} />
        </div>
      </section>
    </main>
  );
}

export const ErrorBoundary = GlobalErrorBoundary;
