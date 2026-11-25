import * as React from 'react';

import { CHAT_DENIED_ACTIONS_COPY } from '../data/copy';
import type { ChatTurnDeniedActionsEvent } from '../types';

export interface ChatDeniedActionsNoticeProps {
  /** The turn's denied-actions event (readable labels of what was refused). */
  readonly event: ChatTurnDeniedActionsEvent;
}

/**
 * @description One muted status line shown in an assistant turn that was
 * refused a permission: "Permission denied: McpTool, pwd." followed by a hint.
 * A refusal can end a turn with no answer text (agy does), so without this the
 * turn would show nothing at all.
 * @public
 */
export const ChatDeniedActionsNotice = (
  props: ChatDeniedActionsNoticeProps,
): React.ReactElement => {
  const { event } = props;

  // Hooks

  // Setup
  const actions = event.actions.join(', ');

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className="text-muted-foreground my-1 text-sm"
      data-testid="ChatDeniedActionsNotice"
      role="status"
    >
      <span className="text-foreground font-medium">
        {CHAT_DENIED_ACTIONS_COPY.prefix}
      </span>{' '}
      <span data-testid="ChatDeniedActionsNotice-actions">{actions}.</span>{' '}
      {CHAT_DENIED_ACTIONS_COPY.hint}
    </div>
  );
};
