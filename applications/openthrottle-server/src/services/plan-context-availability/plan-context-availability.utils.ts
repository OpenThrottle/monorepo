import {
  ATTACH_PROMPT_PLACEMENTS,
  ATTACH_PROMPT_TYPES,
} from '@openthrottle/openthrottle-skills';
import { z } from 'zod';

import type {
  AttachedPromptDetails,
  PlanContextAttachedPrompt,
} from './plan-context-availability.types.ts';

/**
 * Shape `AttachPromptExecutor` writes into an 'applied' ledger row's `details`. A row that does
 * not parse (hand-edited, or written by an older executor) is skipped, never a failed read.
 */
const attachedPromptDetailsSchema = z.object({
  placement: z.enum(ATTACH_PROMPT_PLACEMENTS),
  promptId: z.string().min(1),
  promptType: z.enum(ATTACH_PROMPT_TYPES),
});

/**
 * @description Parses an attach-prompt ledger row's `details`, or null when it is not the shape
 * the executor writes.
 */
export const parseAttachedPromptDetails = (
  details: unknown,
): AttachedPromptDetails | null => {
  const parsed = attachedPromptDetailsSchema.safeParse(details);

  return parsed.success ? parsed.data : null;
};

/**
 * @description Puts attached prompts in composition order: every `start` prompt, then every
 * `end` prompt, each group keeping the order it was given in (the ledger's attach order). Pure.
 */
export const orderAttachedPrompts = (
  prompts: readonly PlanContextAttachedPrompt[],
): PlanContextAttachedPrompt[] => {
  return [
    ...prompts.filter((prompt) => prompt.placement === 'start'),
    ...prompts.filter((prompt) => prompt.placement === 'end'),
  ];
};
