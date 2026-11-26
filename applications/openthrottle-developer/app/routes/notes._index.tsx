import { toErrorMessage } from '@openthrottle/nodejs-utils';
import {
  executeGraphqlWithAuth,
  parseFormData,
} from '@openthrottle/react-router-graphql';
import { OpenThrottlePagination } from '@openthrottle/react-router-ui';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import {
  GlobalErrorBoundary,
  GlobalScreen,
  GlobalStatsPanel,
  readSearchParam,
  ROUTE_STATS_URL,
  shouldRevalidateIgnoringParams,
} from '@openthrottle/react-router-ui-global';
import {
  mergeRouteModuleMeta,
  parsePagination,
} from '@openthrottle/react-router-utils';
import * as React from 'react';
import { useFetcher, useSearchParams } from 'react-router';

import type { Route } from '@/app/routes/+types/notes._index';
import { DeleteNoteDocument, GetNotesDocument } from '~/__generated__/graphql';
import { SITE_TITLE } from '~/global/config/settings';
import { NoteCard } from '~/routing/notes/components/NoteCard';
import { NotesEmpty } from '~/routing/notes/components/NotesEmpty';
import { NotesIntroduction } from '~/routing/notes/components/NotesIntroduction';
import { NotesStats } from '~/routing/notes/components/NotesStats';
import { NotesTable } from '~/routing/notes/components/NotesTable';
import { NotesToolbar } from '~/routing/notes/components/NotesToolbar';
import { NOTES_DELETE_FETCHER_KEY } from '~/routing/notes/config/note-actions';
import { NOTES_ROW_ACTIONS_COPY } from '~/routing/notes/data/copy';
import { filterNotesBySearch } from '~/routing/notes/utils/filterNotesBySearch';
import { countNoteStats } from '~/routing/notes/utils/notes-stats';
import { NotesActionFormSchema } from '~/routing/notes/utils/NotesActionFormSchema';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Notes',
  links: (_match) => [{ children: 'Settings', to: '/settings' }],
};

export const loader = async (args: Route.LoaderArgs) => {
  const url = args.url;
  const searchParams = url?.searchParams ?? new URLSearchParams();
  const search = readSearchParam(searchParams);

  const { notes: allNotes } = await executeGraphqlWithAuth(
    args.request,
    GetNotesDocument,
  );

  const { limit, offset, page } = parsePagination(searchParams);
  const filteredNotes = filterNotesBySearch(allNotes, search);
  const stats = countNoteStats(filteredNotes, Date.now());
  const notes = filteredNotes.slice(offset, offset + limit);

  return { limit, notes, page, search, stats, total: filteredNotes.length };
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
  const { limit, notes, page, search, stats, total } = loaderData;

  // Hooks
  const [searchParams] = useSearchParams();
  const deleteFetcher = useFetcher<typeof action>({
    key: NOTES_DELETE_FETCHER_KEY,
  });

  // Setup
  const deleteData = deleteFetcher.data;
  const hasNoteError = deleteData != null && 'noteError' in deleteData;
  const noteError = hasNoteError ? deleteData.noteError : null;
  const isCard = searchParams.get('view') === 'card';
  const view: 'card' | 'table' = isCard ? 'card' : 'table';

  // Handlers

  const hasNotes = notes.length > 0;

  // Markup
  const emptyState = <NotesEmpty search={search} />;
  const cardGrid = (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} />
      ))}
    </div>
  );
  const cardView = hasNotes ? cardGrid : emptyState;
  const tableView = <NotesTable notes={notes} />;
  const errorAlert = (
    <p className="text-destructive text-sm" role="alert">
      {noteError}
    </p>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <NotesIntroduction />

      <GlobalStatsPanel>
        <NotesStats
          authorCount={stats.authorCount}
          createdLast30Days={stats.createdLast30Days}
          total={stats.total}
          updatedLast7Days={stats.updatedLast7Days}
        />
      </GlobalStatsPanel>

      <div className="flex flex-col gap-4">
        <NotesToolbar />
        {noteError != null ? errorAlert : null}
        {view === 'card' ? cardView : tableView}
        <OpenThrottlePagination
          basePath="/notes"
          className="mt-8"
          limit={limit}
          page={page}
          // `?search=` and `?view=` are not in the extras contract, so clone
          // the live query string to keep them across a page change.
          preserveSearchParams={true}
          resultLabel="notes"
          total={total}
        />
      </div>
    </GlobalScreen>
  );
}

export const shouldRevalidate = shouldRevalidateIgnoringParams([
  ROUTE_STATS_URL.param,
]);

export const action = async (args: Route.ActionArgs) => {
  const formData = await args.request.formData();
  const parsed = parseFormData(formData, NotesActionFormSchema, { allow: [] });

  if (!parsed.success) {
    return { noteError: parsed.error };
  }

  try {
    const result = await executeGraphqlWithAuth(
      args.request,
      DeleteNoteDocument,
      { id: parsed.data.id },
    );

    if (!result.deleteNote) {
      return { noteError: NOTES_ROW_ACTIONS_COPY.deleteError };
    }

    return { noteDeleted: true as const };
  } catch (error) {
    console.error('[notes] delete failed', toErrorMessage(error));

    return { noteError: NOTES_ROW_ACTIONS_COPY.deleteError };
  }
};

export const ErrorBoundary = GlobalErrorBoundary;
