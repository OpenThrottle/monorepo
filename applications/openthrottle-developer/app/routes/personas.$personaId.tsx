import * as React from 'react';
import { Link } from 'react-router';
import { BookOpenIcon } from 'lucide-react';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import {
  GlobalHeading,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { OpenThrottleClipboard } from '@openthrottle/react-router-ui';
import type { Route } from '@/app/routes/+types/personas.$personaId';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (match) => match.loaderData?.persona.slug ?? 'Persona',
  links: (_match) => [{ children: 'Personas', to: '/personas' }],
};

export const loader = async (args: Route.LoaderArgs) => {
  const personaId = args.params.personaId;

  if (!personaId) {
    throw new Response('Missing persona id', { status: 400 });
  }

  const slug = decodeURIComponent(personaId);
  const { findRepoPersonaBySlug, readRepoPersonaFileContent } =
    await import('~/routing/agents/data/discover-repo-personas.server');
  const { getMonorepoRoot } =
    await import('~/routing/agents/data/resolve-monorepo-root.server');

  const monorepoRoot = getMonorepoRoot();
  const persona = findRepoPersonaBySlug(monorepoRoot, slug);

  if (!persona) {
    throw new Response('Persona not found', { status: 404 });
  }

  const content = readRepoPersonaFileContent(
    monorepoRoot,
    persona.repoRelativePath,
  );

  return { content, persona };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((args) => {
  const title = args.data?.persona?.slug ?? 'Persona';
  return [{ title: `${title} | Personas | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { content, persona } = props.loaderData;

  return (
    <GlobalScreen>
      <div className="mb-4">
        <Link
          className="text-sm text-muted-foreground hover:text-foreground"
          to="/personas"
        >
          ← Back to personas
        </Link>
      </div>
      <GlobalHeading
        className="mb-4"
        heading="h1"
        icon={BookOpenIcon}
        title={persona.slug}
      />
      <p className="mb-4 text-sm text-muted-foreground">{persona.summary}</p>
      <div className="mb-4 flex items-center gap-2 text-sm">
        <code>{persona.repoRelativePath}</code>
        <OpenThrottleClipboard
          label="Copy path"
          text={persona.repoRelativePath}
        />
      </div>
      {content ? (
        <pre className="overflow-x-auto rounded-lg border ui-border bg-card p-4 text-xs whitespace-pre-wrap">
          {content}
        </pre>
      ) : (
        <p className="text-sm text-muted-foreground">
          Persona file could not be read from disk.
        </p>
      )}
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
