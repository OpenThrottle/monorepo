import * as React from 'react';
import { FaqView } from '@openthrottle/react-router-docs';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import { faqEntries } from '~/routing/faq/data/faq-navigation';
import type { Route } from '@/app/routes/+types/faq._index';

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: `FAQ | ${SITE_TITLE}` }];
};

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData: _l, matches: _m, params: _p } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold">
        Frequently asked questions
      </h1>
      <FaqView entries={faqEntries} />
    </main>
  );
}

export const ErrorBoundary = GlobalErrorBoundary;
