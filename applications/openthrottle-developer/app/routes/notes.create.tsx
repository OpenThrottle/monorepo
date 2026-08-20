import * as React from 'react';
import {
  executeGraphqlWithAuth,
  parseFormData,
} from '@openthrottle/react-router-graphql';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import {
  getActionError,
  mergeRouteModuleMeta,
} from '@openthrottle/react-router-utils';
import { redirect } from 'react-router';
import { NoteForm } from '~/routing/notes/components/NoteForm';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { CreateNoteDocument, GetMyUserDocument } from '~/__generated__/graphql';
import { CreateNoteInputSchema } from '~/__generated__/schemas';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/notes.create';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Create',
  links: (_match) => [{ children: 'Notes', to: '/notes' }],
};

export const loader = async (args: Route.LoaderArgs) => {
  // The server stamps the note's author from the request principal; this only
  // tells the user who that will be, so a failed `me` degrades to no
  // attribution rather than blocking the create form.
  try {
    const result = await executeGraphqlWithAuth(
      args.request,
      GetMyUserDocument,
    );

    return { authorName: result.me?.githubUsername ?? null };
  } catch (error) {
    console.error('notes.create loader: GetMyUser failed', error);

    return { authorName: null };
  }
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Create note | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData, loaderData, matches: _m, params: _p } = props;
  const { authorName } = loaderData;

  // Hooks

  // Setup
  const actionError = getActionError(actionData);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <NoteForm
        action="create"
        authorName={authorName ?? undefined}
        error={actionError}
      />
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const formData = await args.request.formData();

  // `content` is required (`min(1)` from codegen). The form posts no `author`,
  // and the schema keeps it optional, so parsing succeeds on content alone.
  const parsed = parseFormData(formData, CreateNoteInputSchema());
  if (!parsed.success) {
    return { error: 'Content is required.' };
  }

  try {
    // Send only `content`: the server stamps `author` from the request
    // principal, and forwarding a client value would let the caller override
    // its own attribution.
    const result = await executeGraphqlWithAuth(
      args.request,
      CreateNoteDocument,
      { input: { content: parsed.data.content } },
    );

    return redirect(`/notes/${result.createNote.id}`);
  } catch (error) {
    const isError = error instanceof Error;

    return {
      error: isError ? error.message : 'Failed to create note.',
    };
  }

  // 🚨 Default to invalid action error when no intent is provided.
  // throw new Error('Invalid intent');
};

export const ErrorBoundary = GlobalErrorBoundary;
