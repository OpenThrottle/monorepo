export interface AgentCliActionLabelInput {
  readonly installed: boolean;
  readonly running: boolean;
}

/**
 * @description The Install/Update button label for an agent CLI row: the verb while idle, its
 * progressive form while a setup run is in flight.
 */
export const getAgentCliActionLabel = (
  input: AgentCliActionLabelInput,
): string => {
  if (input.running) {
    if (input.installed) {
      return 'Updating…';
    }
    return 'Installing…';
  }
  if (input.installed) {
    return 'Update';
  }
  return 'Install';
};
