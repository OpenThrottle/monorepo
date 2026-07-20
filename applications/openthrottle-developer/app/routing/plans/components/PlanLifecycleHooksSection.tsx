import * as React from 'react';
import { useFetcher } from 'react-router';
import { PlanLifecycleHooks } from '~/routing/plans/components/PlanLifecycleHooks';
import { AddHookDialog } from '~/routing/plans/components/AddHookDialog';
import type { PlanLifecycleHook } from '~/routing/plans/components/PlanLifecycleHooks';
import type {
  AddHookSubmitPayload,
  HookRole,
} from '~/routing/plans/components/AddHookDialog';

export interface PlanLifecycleHooksSectionProps {
  afterHooks: PlanLifecycleHook[];
  /** Anchor task id for task-level hooks; omit/null for plan-level hooks. */
  anchorTaskId?: string | null;
  beforeHooks: PlanLifecycleHook[];
  className?: string;
  heading?: string;
  planId: string;
}

/**
 * @description Route-connected container for a plan's or task's lifecycle hooks.
 * Owns the add-dialog state and posts `addHook`/`detachHook` intents to the
 * plan-detail route action via a fetcher (which auto-revalidates the nested
 * beforeHooks/afterHooks in the loader). Presentation lives in
 * {@link PlanLifecycleHooks} and {@link AddHookDialog}.
 */
export const PlanLifecycleHooksSection = (
  props: PlanLifecycleHooksSectionProps,
): React.ReactElement => {
  const { afterHooks, anchorTaskId, beforeHooks, className, heading, planId } =
    props;

  // Hooks
  const fetcher = useFetcher();
  const [dialogRole, setDialogRole] = React.useState<HookRole | null>(null);

  // Setup
  const isPlanLevel = anchorTaskId == null;
  const pending = fetcher.state !== 'idle';

  // Handlers
  const handleDetach = React.useCallback(
    (hookTaskId: string) => {
      fetcher.submit({ hookTaskId, intent: 'detachHook' }, { method: 'post' });
    },
    [fetcher],
  );

  const handleSubmit = React.useCallback(
    (payload: AddHookSubmitPayload) => {
      fetcher.submit(
        {
          intent: 'addHook',
          planId,
          role: payload.role,
          source: payload.source,
          ...(anchorTaskId != null ? { anchorTaskId } : {}),
          ...(payload.scope != null ? { scope: payload.scope } : {}),
          ...(payload.skillSlug != null
            ? { skillSlug: payload.skillSlug }
            : {}),
          ...(payload.title != null ? { title: payload.title } : {}),
        },
        { method: 'post' },
      );

      setDialogRole(null);
    },
    [anchorTaskId, fetcher, planId],
  );

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <PlanLifecycleHooks
        afterHooks={afterHooks}
        beforeHooks={beforeHooks}
        className={className}
        heading={heading}
        onDetach={handleDetach}
        onRequestAdd={setDialogRole}
      />
      {dialogRole != null && (
        <AddHookDialog
          isPlanLevel={isPlanLevel}
          onOpenChange={(open) => {
            if (!open) {
              setDialogRole(null);
            }
          }}
          onSubmit={handleSubmit}
          open={true}
          pending={pending}
          role={dialogRole}
        />
      )}
    </>
  );
};
