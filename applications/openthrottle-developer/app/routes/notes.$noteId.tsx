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
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { MarkdownRenderer } from '@openthrottle/react-router-markdown';
import { NoteForm } from '~/routing/notes/components/NoteForm';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/notes.$noteId';
import { useSearchParams } from 'react-router';
import { Button } from '@openthrottle/react-router-shadcn';
import { EyeIcon, PencilIcon } from 'lucide-react';
import {
  OpenThrottleClipboard,
  OpenThrottleEmptyState,
} from '@openthrottle/react-router-ui';

/** Search param toggling the note detail between read (absent) and edit modes. */
const NOTE_MODE_PARAM = 'mode';
const NOTE_EDIT_MODE = 'edit';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (match) => (
    <OpenThrottleClipboard
      className="cursor-pointer whitespace-nowrap"
      label={match.params.noteId}
      text={match.params.noteId ?? 'not-found'}
    />
  ),
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

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Note Details | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;

  // Hooks
  const [searchParams, setSearchParams] = useSearchParams();

  // Setup
  const { note } = loaderData;
  const isEditing = searchParams.get(NOTE_MODE_PARAM) === NOTE_EDIT_MODE;

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
    <GlobalScreen className="flex w-full max-w-3xl flex-col gap-6 p-4 md:p-8">
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
        <NoteForm action="update" note={note} />
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
