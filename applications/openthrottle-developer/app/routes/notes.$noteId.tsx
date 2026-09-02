import * as React from 'react';
import {
  getActionError,
  mergeRouteModuleMeta,
} from '@openthrottle/react-router-utils';
import {
  executeGraphqlWithAuth,
  parseFormData,
} from '@openthrottle/react-router-graphql';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import {
  GetNoteByIdDocument,
  UpdateNoteDocument,
} from '~/__generated__/graphql';
import { UpdateNoteInputSchema } from '~/__generated__/schemas';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { MarkdownRenderer } from '@openthrottle/react-router-markdown';
import { NoteForm } from '~/routing/notes/components/NoteForm';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/notes.$noteId';
import { useActionToast } from '~/global/hooks/useActionToast';
import { useNavigation, useSearchParams } from 'react-router';
import { Button } from '@openthrottle/react-router-shadcn';
import { EyeIcon, PencilIcon } from 'lucide-react';
import {
  OpenThrottleClipboard,
  OpenThrottleEmptyState,
} from '@openthrottle/react-router-ui';
import {
  NOTE_EDIT_MODE,
  NOTE_MODE_PARAM,
} from '~/routing/notes/config/note-mode';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (match) => (
    <OpenThrottleClipboard
      className="cursor-pointer whitespace-nowrap"
      label={match.params.noteId}
      text={match.params.noteId ?? 'not-found'}
    />
  ),
  links: (_match) => [
    { children: 'Settings', to: '/settings' },
    { children: 'Notes', to: '/notes' },
  ],
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

export const links: Route.LinksFunction = () => {
  return [];
};

// `NoteObject` has no name/title field — a note is identified by its id (the
// breadcrumb renders the id itself), so there is nothing better than the
// generic label to put in the tab.
export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Note | Notes | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData, loaderData, matches: _m, params: _p } = props;
  const { note } = loaderData;

  // Hooks
  const [searchParams, setSearchParams] = useSearchParams();
  const navigation = useNavigation();

  // Setup
  const isEditing = searchParams.get(NOTE_MODE_PARAM) === NOTE_EDIT_MODE;
  const actionError = getActionError(actionData);

  // Handlers
  const onSetMode = (edit: boolean): void => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (edit) {
          next.set(NOTE_MODE_PARAM, NOTE_EDIT_MODE);
        } else {
          next.delete(NOTE_MODE_PARAM);
        }
        return next;
      },
      { preventScrollReset: true },
    );
  };

  // Markup

  // Life Cycle
  useActionToast(actionData, {
    active: navigation.state !== 'idle',
    id: 'note-update',
    onSuccess: () => onSetMode(false),
    success: 'Note updated.',
  });

  // 🔌 Short Circuit
  if (!note) {
    return (
      <GlobalScreen>
        <OpenThrottleEmptyState
          description="The note you are looking for does not exist."
          title="Note not found"
        />
      </GlobalScreen>
    );
  }

  return (
    <GlobalScreen>
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground text-sm">
          {note.author ? (
            <span className="text-foreground font-medium">{note.author}</span>
          ) : (
            'No author'
          )}
        </span>

        <div className="flex gap-2" role="group">
          <Button
            onClick={() => onSetMode(false)}
            size="sm"
            variant={isEditing ? 'outline' : 'default'}
          >
            <EyeIcon />
            Read
          </Button>
          <Button
            onClick={() => onSetMode(true)}
            size="sm"
            variant={isEditing ? 'default' : 'outline'}
          >
            <PencilIcon />
            Edit
          </Button>
        </div>
      </div>

      {isEditing ? (
        <NoteForm action="update" error={actionError} note={note} />
      ) : (
        <MarkdownRenderer source={note.content} />
      )}
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const noteId = args.params.noteId;
  if (!noteId) {
    return { error: 'Missing note id.' };
  }

  const formData = await args.request.formData();
  // `id` is the route param; `author`/`content` are optional. Preserve the
  // clear-to-null on `author` (blank clears it) that the update form expects.
  const parsed = parseFormData(
    formData,
    UpdateNoteInputSchema().omit({ id: true }),
  );
  if (!parsed.success) {
    return { error: parsed.error };
  }

  try {
    const input = {
      author: parsed.data.author ?? null,
      content: parsed.data.content,
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

    return { ok: true as const };
  } catch {
    return { error: 'Could not update the note. Please try again.' };
  }
};

export const ErrorBoundary = GlobalErrorBoundary;
