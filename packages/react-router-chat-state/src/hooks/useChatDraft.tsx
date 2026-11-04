import { useAtomValue, useSetAtom } from 'jotai';
import * as React from 'react';

import {
  CHAT_DRAFT_NEW_CONVERSATION_KEY,
  CHAT_DRAFT_WRITE_DELAY_MS,
  chatDraftsAtom,
  readChatDraft,
  writeChatDraft,
} from '../data/atom.chat-drafts';

/**
 * @public
 */
export interface UseChatDraftOptions {
  /** Conversation the draft belongs to; `null` for a new, unsaved chat. */
  readonly conversationId: string | null;
}

/**
 * @public
 */
export interface UseChatDraftResult {
  /** Empties the draft and removes it from storage immediately. */
  readonly clearDraft: () => void;
  readonly draft: string;
  readonly setDraft: React.Dispatch<React.SetStateAction<string>>;
}

/**
 * @description Composer draft text that survives navigation and reloads, kept
 * per conversation in {@link chatDraftsAtom}. Typing shows at once and is
 * written to storage after a {@link CHAT_DRAFT_WRITE_DELAY_MS} pause; an
 * emptied draft (sent or cleared) is removed immediately. Switching
 * conversation shows that conversation's draft, and an unwritten edit to the
 * previous one is flushed rather than dropped, as it is on unmount.
 * @public
 */
export function useChatDraft(options: UseChatDraftOptions): UseChatDraftResult {
  const { conversationId } = options;

  // Hooks
  const drafts = useAtomValue(chatDraftsAtom);
  const setDrafts = useSetAtom(chatDraftsAtom);
  // The edit not yet written to storage. While it exists it wins over the
  // stored draft; once written it is dropped and the atom is the source again.
  const [edit, setEdit] = React.useState<{
    readonly key: string;
    readonly text: string;
  } | null>(null);
  // Mirror of an unwritten edit for the flush-on-switch/unmount cleanup.
  const pendingRef = React.useRef<{ key: string; text: string } | null>(null);

  // Setup
  const key = conversationId ?? CHAT_DRAFT_NEW_CONVERSATION_KEY;
  const draft =
    edit !== null && edit.key === key ? edit.text : readChatDraft(drafts, key);

  // Handlers
  const writeNow = React.useCallback(
    (draftKey: string, text: string): void => {
      pendingRef.current = null;
      setDrafts((previous) => writeChatDraft(previous, draftKey, text));
    },
    [setDrafts],
  );

  const setDraft: React.Dispatch<React.SetStateAction<string>> = (action) => {
    setEdit((previous) => {
      const base = previous !== null && previous.key === key ? previous.text : draft; // prettier-ignore
      const text = typeof action === 'function' ? action(base) : action;
      return { key, text };
    });
  };

  const clearDraft = (): void => {
    setEdit(null);
    writeNow(key, '');
  };

  // Markup

  // Life Cycle
  React.useEffect(() => {
    if (edit === null) {
      return;
    }

    if (edit.text === '') {
      writeNow(edit.key, '');
      setEdit(null);
      return;
    }

    pendingRef.current = edit;
    const timer = window.setTimeout(() => {
      writeNow(edit.key, edit.text);
      setEdit(null);
    }, CHAT_DRAFT_WRITE_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [edit, writeNow]);

  React.useEffect(() => {
    return () => {
      const pending = pendingRef.current;
      if (pending !== null && pending.key === key) {
        writeNow(pending.key, pending.text);
      }
    };
  }, [key, writeNow]);

  // 🔌 Short Circuit

  return { clearDraft, draft, setDraft };
}
