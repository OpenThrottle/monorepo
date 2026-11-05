import { PLAN_EDITOR_ACTIONS_COPY } from '~/routing/plans/data/data.copy';

export interface PlanEditorTooltipInput {
  /** Null when the editor's precondition (a checkout folder) is unmet. */
  readonly href: string | null;
  readonly label: string;
  readonly promptTargetsFocusedWindow: boolean;
}

/**
 * @description Tooltip copy for an editor deep-link button: the fix when the
 * link cannot be built, a focused-window caveat for editors that cannot target a
 * window, otherwise the plain "open" hint.
 */
export const getPlanEditorTooltip = (input: PlanEditorTooltipInput): string => {
  const { href, label, promptTargetsFocusedWindow } = input;

  if (href === null) {
    return PLAN_EDITOR_ACTIONS_COPY.needsCheckoutTooltip(label);
  }

  if (promptTargetsFocusedWindow) {
    return PLAN_EDITOR_ACTIONS_COPY.focusedWindowTooltip(label);
  }

  return PLAN_EDITOR_ACTIONS_COPY.openTooltip(label);
};
