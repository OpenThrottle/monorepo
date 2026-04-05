import * as React from 'react';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { redirect } from 'react-router';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { NoteForm } from '~/routing/notes/components/NoteForm';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/notes.create';
import { CreateNoteDocument, CreateNoteInput } from '~/__generated__/graphql';

// export const loader = async (args: Route.LoaderArgs) => {
//   return {}
// };

// export const links: LinksFunction = () => {
//   return [{ href: stylesheet, rel: 'stylesheet' }];
// };

// export const meta = (_args: Route.MetaArgs) => {
//   return [{ title: `NoteCreate | ${SITE_TITLE}` }];
// };

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Create note | ${SITE_TITLE}` }];
});

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
    <main className="p-4 md:p-8 lg:p-12 relative h-full max-w-7xl mx-auto w-full">
      <div className="max-w-xl mx-auto">
        <h1 className="text-xl my-4 text-highlight">Create Note</h1>
        <NoteForm action="create" />
      </div>
    </main>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const formData = await args.request.formData();

  const content = formData.get('content');
  const author = formData.get('author');

  if (typeof content !== 'string') {
    return { error: 'Content is required.' };
  }

  try {
    const isString = typeof author === 'string';
    const input: CreateNoteInput = {
      author: isString && author.trim() ? author.trim() : null,
      content: content.trim(),
    };

    const result = await executeGraphqlWithAuth(
      args.request,
      CreateNoteDocument,
      { input },
    );

    return redirect(`/notes/${result.createNote.id}`);
  } catch (error) {
    const isError = error instanceof Error;

    return {
      error: isError ? error.message : 'Failed to create note.',
    };
  }
};

export const ErrorBoundary = GlobalErrorBoundary;
