import * as React from 'react';
import { CircleHelpIcon } from 'lucide-react';
import {
  GlobalHeading,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import {
  DocsSearch,
  FaqHero,
  FaqView,
  buildFaqCategories,
} from '@openthrottle/react-router-docs';
import { SITE_TITLE } from '~/global/config/settings';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { docsManifest } from '~/routing/docs/data/docsManifest';
import { useDocsFeatureFlags } from '~/global/hooks/useDocsFeatureFlags';
import type { Route } from '@/app/routes/+types/faq._index';

const faqEntries = docsManifest.filter((entry) => entry.section === 'faq');
const faqCategories = buildFaqCategories(faqEntries);

const FAQ_INTRO =
  'Answers to common questions about running OpenThrottle locally, how plans and tasks work, and the agentic workflows behind the developer app. Search above or jump to a category below.';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'FAQ',
  links: (_match) => [{ children: 'Settings', to: '/settings' }],
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const loader = async (_args: Route.LoaderArgs) => {
  return {};
};

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: `FAQ | ${SITE_TITLE}` }];
};

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData: _l, matches: _m, params: _p } = props;

  // Hooks
  const [flags] = useDocsFeatureFlags();

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <GlobalHeading heading="h1" icon={CircleHelpIcon} title="FAQ" />
        {flags.search ? (
          <DocsSearch
            className="sm:w-64"
            entries={docsManifest}
            triggerLabel="Search FAQ…"
          />
        ) : null}
      </div>

      {flags.landing ? (
        <FaqHero
          categories={faqCategories}
          className="mb-6"
          description={FAQ_INTRO}
        />
      ) : (
        <p className="text-muted-foreground mb-6 max-w-3xl text-sm">
          {FAQ_INTRO}
        </p>
      )}

      <FaqView className="max-w-3xl" entries={faqEntries} />
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
