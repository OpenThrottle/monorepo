import { FEATURE_BETA_PREVIEW } from '@openthrottle/react-router-utils';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { HomeComingSoon } from '~/routing/home/components/HomeComingSoon';
import { HomeFeatures } from '~/routing/home/components/HomeFeatures';
import { HomeHeroV1 } from '~/routing/home/components/HomeHeroV1';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/_index';

export const loader = async (_args: Route.LoaderArgs) => {
  return {};
};

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: SITE_TITLE }];
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
    <>
      {FEATURE_BETA_PREVIEW ? (
        <>
          {/*
          <blockquote>
            OpenThrottle is a plans knowledge base: a Postgres-backed app and MCP
            server that stores plans, tasks, and semantic search over them. It
            powers “ask OT,” agentic execution (Ralph), and a dashboard so
            you can see what's in progress and what shipped.
          </blockquote>
          */}
          <HomeHeroV1 className="flex-1 flex items-center min-h-svh" />
          <HomeFeatures />
        </>
      ) : (
        <>
          <HomeComingSoon className="flex-1 flex items-center" />
        </>
      )}
    </>
  );
}

// export const action = async (_args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = GlobalErrorBoundary;
