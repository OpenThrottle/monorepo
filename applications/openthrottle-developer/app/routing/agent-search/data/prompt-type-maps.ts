import { CustomPromptType } from '~/__generated__/graphql';
import type { AgentAssetPromptType } from '~/routing/agent-search/types';

/** Agent-asset prompt type → GraphQL {@link CustomPromptType} (search input). */
export const PROMPT_TYPE_TO_GQL: Readonly<
  Record<AgentAssetPromptType, CustomPromptType>
> = {
  personas: CustomPromptType.Personas,
  rules: CustomPromptType.Rules,
  skills: CustomPromptType.Skills,
};

/** GraphQL {@link CustomPromptType} → agent-asset prompt type (result mapping). */
export const GQL_TO_PROMPT_TYPE: Readonly<
  Partial<Record<CustomPromptType, AgentAssetPromptType>>
> = {
  [CustomPromptType.Personas]: 'personas',
  [CustomPromptType.Rules]: 'rules',
  [CustomPromptType.Skills]: 'skills',
};
