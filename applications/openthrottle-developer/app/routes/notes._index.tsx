import * as React from 'react';
import { Button } from '@openthrottle/react-router-shadcn';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalHeading,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { Link } from 'react-router';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { NotebookTextIcon } from 'lucide-react';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { GetNotesDocument } from '~/__generated__/graphql';
import { NoteCard } from '~/routing/notes/components/NoteCard';
import { SITE_TITLE } from '~/global/config/settings';
import { WorkspaceEntityCrossLinks } from '~/routing/navigation/components/WorkspaceEntityCrossLinks';
import type { Route } from '@/app/routes/+types/notes._index';

type LoaderData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<LoaderData> = {
  breadcrumb: (_match) => 'Notes',
  links: (_match) => [],
};

export const loader = async (args: Route.LoaderArgs) => {
  const { notes } = await executeGraphqlWithAuth(
    args.request,
    GetNotesDocument,
  );

  return { notes };
};

// export const links: LinksFunction = () => {
//   return [{ href: stylesheet, rel: 'stylesheet' }];
// };

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Notes | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;

  // Hooks

  // Setup
  const { notes } = loaderData;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <div>
        <GlobalHeading
          className="mb-4"
          heading="h1"
          icon={NotebookTextIcon}
          title="Notes"
        />
        <p className="text-sm text-muted-foreground">
          Notes are a collection of unstructured thoughts and ideas.
        </p>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <WorkspaceEntityCrossLinks
          className="min-w-0"
          label="Workspace shortcuts from notes"
        />
        <div className="flex shrink-0 items-center justify-end">
          <Button asChild={true} size="sm" variant="outline">
            <Link to="/notes/create" viewTransition={true}>
              Create Note
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-8">
        {notes.map((note) => (
          <NoteCard key={note.id} note={note} />
        ))}
      </div>
    </GlobalScreen>
  );
}

// export const action = async (_args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = GlobalErrorBoundary;
