import * as React from 'react';
import { PLAN_LIFECYCLE_HOOKS_COPY } from '~/routing/plans/data/data.copy';
import { HookTaskList } from '~/routing/plans/components/HookTaskList';
import type { HookTaskListItem } from '~/routing/plans/components/HookTaskList';

/**
 * @description A materialized hook-task as this section needs it — the subset of
 * the generated HookTask fragment consumed by {@link HookTaskList}. Decoupled
 * from the codegen type so the component stays pure and unit-testable; the route
 * layer maps its fragment onto this shape.
 */
export type PlanLifecycleHook = HookTaskListItem;

export interface PlanLifecycleHooksProps {
  afterHooks: PlanLifecycleHook[];
  beforeHooks: PlanLifecycleHook[];
  className?: string;
  /** Optional heading; omit to render the two groups without a section title. */
  heading?: string;
  onDetach: (hookTaskId: string) => void;
  /** Fired when an add control is clicked, with the group's role. */
  onRequestAdd: (role: 'after' | 'before') => void;
}

/**
 * @description Renders a plan's (or task's) before/after lifecycle hooks as two
 * nested, visually-separated {@link HookTaskList} groups. Purely presentational:
 * add is surfaced via {@link PlanLifecycleHooksProps.onRequestAdd} (the caller
 * opens the dialog) and detach via {@link PlanLifecycleHooksProps.onDetach}.
 */
export const PlanLifecycleHooks = (
  props: PlanLifecycleHooksProps,
): React.ReactElement => {
  const {
    afterHooks,
    beforeHooks,
    className,
    heading,
    onDetach,
    onRequestAdd,
  } = props;

  // Hooks

  // Setup

  // Handlers
  const handleAddBefore = React.useCallback(
    () => onRequestAdd('before'),
    [onRequestAdd],
  );
  const handleAddAfter = React.useCallback(
    () => onRequestAdd('after'),
    [onRequestAdd],
  );

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section
      aria-label={heading ?? PLAN_LIFECYCLE_HOOKS_COPY.planSectionTitle}
      className={className}
    >
      {heading != null && (
        <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
          {heading}
        </h3>
      )}
      <div className="flex flex-col gap-3">
        <HookTaskList
          hooks={beforeHooks}
          onAdd={handleAddBefore}
          onDetach={onDetach}
          role="before"
        />
        <HookTaskList
          hooks={afterHooks}
          onAdd={handleAddAfter}
          onDetach={onDetach}
          role="after"
        />
      </div>
    </section>
  );
};
