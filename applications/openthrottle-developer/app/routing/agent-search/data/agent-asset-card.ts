import type { AgentAssetPromptType } from '~/routing/agent-search/types';

/** Disk-backed list surface per prompt type (null when no in-app page exists yet). */
export const AGENT_ASSET_LIST_HREF_BY_TYPE: Readonly<
  Record<AgentAssetPromptType, string | null>
> = {
  personas: '/personas',
  rules: null,
  skills: '/skills',
};

export const AGENT_ASSET_PROMPT_TYPE_LABEL: Readonly<
  Record<AgentAssetPromptType, string>
> = {
  personas: 'Persona',
  rules: 'Rule',
  skills: 'Skill',
};
