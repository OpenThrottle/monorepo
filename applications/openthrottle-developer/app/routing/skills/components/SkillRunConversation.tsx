import { ChatDialog } from '@openthrottle/react-router-chat';
import * as React from 'react';

import { SKILL_RUN_COPY } from '~/routing/skills/data/data.copy';
import type { UseRunSkillResult } from '~/routing/skills/hooks/useRunSkill';

export interface SkillRunConversationProps {
  readonly runSkill: UseRunSkillResult;
}

/**
 * @description Controlled conversation surface: the run streams here once
 * started. The trigger is visually hidden — the skill header's Run-now button
 * drives `open` via the run hook.
 */
export const SkillRunConversation = (
  props: SkillRunConversationProps,
): React.ReactElement => {
  const { runSkill } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <ChatDialog
      messages={runSkill.messages}
      onOpenChange={runSkill.onConversationOpenChange}
      onSendMessage={runSkill.onSendFollowUp}
      open={runSkill.conversationOpen}
      title={SKILL_RUN_COPY.conversationTitle}
      trigger={<span aria-hidden={true} className="sr-only" />}
      variant="sheet"
    />
  );
};
