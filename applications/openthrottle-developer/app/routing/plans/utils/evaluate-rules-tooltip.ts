import { PLAN_TOOLBAR_COPY } from '~/routing/plans/data/data.copy';

export interface EvaluateRulesTooltipInput {
  readonly isRunning: boolean;
  readonly isTerminal: boolean;
}

/**
 * @description Tooltip for the plan toolbar's Evaluate rules button. A terminal
 * plan outranks a running one; otherwise it describes what the pass does.
 */
export const getEvaluateRulesTooltip = (
  input: EvaluateRulesTooltipInput,
): string => {
  const { isRunning, isTerminal } = input;

  if (isTerminal) {
    return PLAN_TOOLBAR_COPY.evaluateRulesTerminalTooltip;
  }

  if (isRunning) {
    return PLAN_TOOLBAR_COPY.evaluateRulesRunningTooltip;
  }

  return 'Queue a tag→action rules evaluation pass for this plan (recomputes skills-via-rules; results appear in the rule applications ledger).';
};
