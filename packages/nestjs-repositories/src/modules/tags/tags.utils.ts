import { TAG_SOURCES, TAGGING_SERVICE_ACCOUNT_NAME } from './tags.constants.ts';
import type { TagCaller, TagSource } from './tags.types.ts';
/**
 * @description Derives the provenance source from the caller identity:
 * user → `human`; the tagging service account → `server-llm`; any other
 * service account (MCP, Ralph workers) → `agent`.
 * @public
 */
export const deriveTagSource = (caller: TagCaller): TagSource => {
  if (caller.principalKind === 'user') {
    return TAG_SOURCES.HUMAN;
  }
  if (caller.serviceAccountName === TAGGING_SERVICE_ACCOUNT_NAME) {
    return TAG_SOURCES.SERVER_LLM;
  }
  return TAG_SOURCES.AGENT;
};
