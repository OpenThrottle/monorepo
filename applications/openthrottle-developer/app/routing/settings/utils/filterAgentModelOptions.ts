import type { AgentCliModelStatus } from '~/routing/settings/data/agent-clis';

/**
 * @description The model options whose id contains `query`, case-insensitive
 * and ignoring surrounding whitespace; a blank query keeps every option.
 */
export const filterAgentModelOptions = (
  options: readonly AgentCliModelStatus[],
  query: string,
): readonly AgentCliModelStatus[] => {
  const needle = query.trim().toLowerCase();
  if (needle === '') {
    return options;
  }
  return options.filter((option) => {
    return option.model.toLowerCase().includes(needle);
  });
};
