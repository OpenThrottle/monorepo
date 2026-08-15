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
import { CreateNoteDocument } from '~/__generated__/graphql';
import { CreateNoteInputSchema } from '~/__generated__/schemas';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/notes.create';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Create',
  links: (_match) => [{ children: 'Notes', to: '/notes' }],
};

export const loader = async (_args: Route.LoaderArgs) => {
  return {};
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
  const { actionData, loaderData: _l, matches: _m, params: _p } = props;

  // Hooks

  // Setup
  const actionError = getActionError(actionData);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <NoteForm action="create" error={actionError} />
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const formData = await args.request.formData();

  // `content` is required (`min(1)` from codegen); `author` is optional and
  // omitted when blank.
  const parsed = parseFormData(formData, CreateNoteInputSchema());
  if (!parsed.success) {
    return { error: 'Content is required.' };
  }

  try {
    const result = await executeGraphqlWithAuth(
      args.request,
      CreateNoteDocument,
      { input: parsed.data },
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
