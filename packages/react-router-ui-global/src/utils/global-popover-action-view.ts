import type { GlobalPopoverAction } from '../components/GlobalPopover';

/**
 * @description Hidden `<input>` entries for a submit action's `fields`, sorted
 * by name so the rendered form is stable. Non-submit actions have none.
 */
export const resolveGlobalPopoverFieldEntries = (
  action: GlobalPopoverAction,
): { name: string; value: string }[] => {
  if (action.kind !== 'submit') {
    return [];
  }

  return Object.keys(action.fields)
    .sort()
    .map((name) => ({ name, value: action.fields[name] ?? '' }));
};

/**
 * @description The label shown for an action: a submit action in its `pending`
 * state prefers `pendingLabel` over `label`.
 */
export const resolveGlobalPopoverActionLabel = (
  action: GlobalPopoverAction,
): string => {
  if (action.kind === 'submit' && action.pending === true) {
    return action.pendingLabel ?? action.label;
  }

  return action.label;
};
