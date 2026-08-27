import type {
  ChatPermissionMode,
  ChatReasoningLevel,
  ChatServiceTier,
} from '@openthrottle/react-router-chat';
import type { DecodedChatOption } from './chat-model-option';

/**
 * @description The toolbar → conversation-stream payload contract, single-sourced
 * so the home-route composer (`useHomeComposer`) and the header-chat controller
 * (`useHeaderChatController`) build the exact same `intent=start` form fields and
 * cannot drift. Three shapes: the plain openai HTTP backend (baseUrl + model, no
 * repo); a CLI backend on its own cloud model; and a CLI backend pointed at a
 * discovered local endpoint (a driver id + baseUrl) — the last carries both the
 * endpoint fields AND the CLI/repo fields.
 */

/** @public */
export interface ChatTurnFieldsParams {
  readonly decoded: DecodedChatOption;
  /** Workspace-relative paths @-mentioned in the message (CLI backends only). */
  readonly fileMentions: readonly string[];
  readonly permissionMode: ChatPermissionMode | null | undefined;
  readonly persist: boolean;
  readonly personaId: string | null | undefined;
  readonly reasoning: ChatReasoningLevel | null | undefined;
  /**
   * Selected checkouts, primary first — index 0 becomes the process `cwd` and
   * the rest become additional granted directories.
   */
  readonly repositoryIds: readonly string[];
  readonly serviceTier: ChatServiceTier | null | undefined;
}

/**
 * Assemble the `intent=start` form fields for a turn from the decoded model
 * option and the effective (capability-reconciled) toolbar selections.
 * @public
 */
export function buildChatTurnFields(
  params: ChatTurnFieldsParams,
): Record<string, string> {
  const {
    decoded,
    fileMentions,
    permissionMode,
    persist,
    personaId,
    reasoning,
    repositoryIds,
    serviceTier,
  } = params;

  return decoded.backend === 'openai'
    ? {
        backend: 'openai',
        baseUrl: decoded.baseUrl ?? '',
        modelId: decoded.model ?? '',
        persist: String(persist),
      }
    : {
        backend: decoded.backend,
        ...(decoded.baseUrl != null ? { baseUrl: decoded.baseUrl } : {}),
        fileMentions: JSON.stringify(fileMentions),
        modelId: decoded.model ?? '',
        permissionMode: permissionMode ?? '',
        persist: String(persist),
        personaId: personaId ?? '',
        reasoning: reasoning ?? '',
        // JSON, mirroring `fileMentions` above: the form stays flat and the
        // action already has a tested decode pattern to copy.
        repositoryIds: JSON.stringify(repositoryIds),
        serviceTier: serviceTier ?? '',
      };
}
