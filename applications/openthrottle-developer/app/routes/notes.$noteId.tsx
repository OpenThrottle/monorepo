import * as React from 'react';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import {
  GetNoteByIdDocument,
  UpdateNoteDocument,
  UpdateNoteInput,
} from '~/__generated__/graphql';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { NoteForm } from '~/routing/notes/components/NoteForm';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/notes.$noteId';

type LoaderData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<LoaderData> = {
  breadcrumb: (_match) => 'Details',
  links: (_match) => [{ children: 'Notes', to: '/notes' }],
};

export const loader = async (args: Route.LoaderArgs) => {
  const noteId = args.params.noteId;
  const { note } = await executeGraphqlWithAuth(
    args.request,
    GetNoteByIdDocument,
    { id: noteId },
  );

  return { note };
};

// export const links: LinksFunction = () => {
//   return [{ href: stylesheet, rel: 'stylesheet' }];
// };

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Note Details | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;

  // Hooks

  // Setup
  const { note } = loaderData;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <NoteForm action="update" note={note ?? undefined} />
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const noteId = args.params.noteId;
  if (!noteId) {
    return { error: 'Missing note id.' };
  }

  const formData = await args.request.formData();
  const content = formData.get('content');
  const author = formData.get('author');

  try {
    const input: UpdateNoteInput = {
      author: typeof author === 'string' ? author.trim() || null : undefined,
      content: typeof content === 'string' ? content : undefined,
      id: noteId,
    };

    const result = await executeGraphqlWithAuth(
      args.request,
      UpdateNoteDocument,
      { input },
    );

    if (!result.updateNote) {
      return { error: 'Note not found.' };
    }

    return {
      redirect: `/notes/${noteId}`,
    };
  } catch {
    return { error: 'Note not found.' };
  }

  // 🚨 Default to invalid action error when no intent is provided.
  // throw new Error('Invalid intent');
};

export const ErrorBoundary = GlobalErrorBoundary;
