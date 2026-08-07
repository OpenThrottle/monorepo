import * as React from 'react';
import type { ChatMessage } from '@openthrottle/react-router-chat';
import { toast } from '@openthrottle/react-router-shadcn';
import { useAgenticChatTurn } from '~/routing/home/hooks/useAgenticChatTurn';
import { SKILL_RUN_COPY } from '~/routing/skills/data/data.copy';
import type { RunSkillPayload } from '~/routing/skills/components/RunSkillDialog';

export interface UseRunSkillResult {
  /** Whether the streaming conversation surface (sheet) is open. */
  readonly conversationOpen: boolean;
  /** True while the run is streaming; drives the composer's stop/indicator. */
  readonly isStreaming: boolean;
  /** User + streamed assistant messages for the conversation view. */
  readonly messages: ChatMessage[];
  readonly onConversationOpenChange: (open: boolean) => void;
  /** Start a run from the modal's composed payload, then open the conversation. */
  readonly onRun: (payload: RunSkillPayload) => void;
  /** Send a follow-up message in the open conversation (reuses the run's fields). */
  readonly onSendFollowUp: (message: string) => void;
  /** Cancel the in-flight run. */
  readonly onStop: () => void;
}

/**
 * @description Route-level run mechanism for the Run-skill modal. Owns a single
 * agentic streaming turn (the SAME {@link useAgenticChatTurn} path the home route
 * and header chat use — no new server mutation) and a controlled conversation
 * sheet. On run it submits the modal's composed `/<slug> <args>` message with the
 * payload's backend/model/repo fields via `submitTurn`, then opens the sheet so
 * the `conversationStreamChunkAdded` tokens stream live in a conversation view.
 * Turn errors surface as a guarded toast (never an empty one).
 */
export const useRunSkill = (): UseRunSkillResult => {
  // Hooks
  const turn = useAgenticChatTurn();
  const [conversationOpen, setConversationOpen] = React.useState(false);
  // The run's backend/model/repo fields, reused verbatim for follow-up turns in
  // the same conversation (the sheet has no toolbar to re-pick them in v1).
  const lastFieldsRef = React.useRef<Record<string, string>>({});
  // Dedupes the error toast to one per distinct message.
  const toastedErrorRef = React.useRef<string | null>(null);

  // Setup

  // Handlers
  const onRun = (payload: RunSkillPayload): void => {
    lastFieldsRef.current = payload.fields;
    setConversationOpen(true);
    turn.submitTurn(payload.message, payload.fields);
  };

  const onSendFollowUp = (message: string): void => {
    const trimmed = message.trim();
    if (trimmed === '') {
      return;
    }

    turn.submitTurn(trimmed, lastFieldsRef.current);
  };

  const onConversationOpenChange = (open: boolean): void => {
    setConversationOpen(open);
  };

  // Life Cycle
  // Surface a turn error as a toast, guarding against an empty message (phantom
  // toast) and re-firing for the same message.
  React.useEffect(() => {
    const error = turn.error;
    if (error == null || error.trim() === '') {
      toastedErrorRef.current = null;
      return;
    }

    if (error === toastedErrorRef.current) {
      return;
    }

    toastedErrorRef.current = error;
    toast.error(`${SKILL_RUN_COPY.runFailedPrefix} ${error}`);
  }, [turn.error]);

  // 🔌 Short Circuit

  return {
    conversationOpen,
    isStreaming: turn.isStreaming,
    messages: turn.messages,
    onConversationOpenChange,
    onRun,
    onSendFollowUp,
    onStop: turn.onStop,
  };
};
