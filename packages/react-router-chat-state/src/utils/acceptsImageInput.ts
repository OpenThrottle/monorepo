import type { ChatModelOption } from '@openthrottle/react-router-chat';

import type { ChatAgentRuntime } from '../types';
import type { DecodedChatOption } from './chat-model-option';

/** Input to {@link acceptsImageInput}. @public */
export interface AcceptsImageInputOptions {
  readonly agentRuntimes: Readonly<Record<string, ChatAgentRuntime>>;
  readonly decodedOption: DecodedChatOption | null;
  readonly modelId: string | undefined;
  readonly models: readonly ChatModelOption[];
}

/**
 * @description Whether the selected composer option takes image attachments:
 * the backend's runtime reports `imageInput`, or (a local OpenAI-compatible
 * endpoint) the selected model is itself vision-capable. One rule for the home
 * composer and the header chat dialog.
 *
 * @public
 */
export const acceptsImageInput = (
  options: AcceptsImageInputOptions,
): boolean => {
  const { agentRuntimes, decodedOption, modelId, models } = options;
  if (decodedOption === null) {
    return false;
  }
  const modelAccepts = models.find((model) => model.id === modelId)?.imageInput === true; // prettier-ignore

  return agentRuntimes[decodedOption.backend]?.imageInput === true || modelAccepts; // prettier-ignore
};
