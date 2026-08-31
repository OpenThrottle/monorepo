import * as React from 'react';
import { useSearchParams } from 'react-router';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
  readSearchParam,
} from '@openthrottle/react-router-ui-global';
import { GetNotesDocument } from '~/__generated__/graphql';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { NoteCard } from '~/routing/notes/components/NoteCard';
import { NotesEmpty } from '~/routing/notes/components/NotesEmpty';
import { NotesIntroduction } from '~/routing/notes/components/NotesIntroduction';
import { NotesTable } from '~/routing/notes/components/NotesTable';
import { NotesToolbar } from '~/routing/notes/components/NotesToolbar';
import { filterNotesBySearch } from '~/routing/notes/utils/filter-notes-by-search';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/notes._index';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Notes',
  links: (_match) => [{ children: 'User', to: '/profile' }],
};

export const loader = async (args: Route.LoaderArgs) => {
  const url = args.url;
  const searchParams = url?.searchParams ?? new URLSearchParams();
  const search = readSearchParam(searchParams);

  const { notes: allNotes } = await executeGraphqlWithAuth(
    args.request,
    GetNotesDocument,
  );

  const notes = filterNotesBySearch(allNotes, search);

  return { notes, search };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Notes | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;
  const { notes, search } = loaderData;

  // Hooks
  const [searchParams] = useSearchParams();

  // Setup
  const isCard = searchParams.get('view') === 'card';
  const view: 'card' | 'table' = isCard ? 'card' : 'table';

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <NotesIntroduction />

      <div className="flex flex-col gap-4">
        <NotesToolbar />
        {view === 'card' ? (
          notes.length === 0 ? (
            <NotesEmpty search={search} />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
              {notes.map((note) => (
                <NoteCard key={note.id} note={note} />
              ))}
            </div>
          )
        ) : (
          <NotesTable
            // className="bg-card"
            notes={notes}
          />
        )}
      </div>
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
