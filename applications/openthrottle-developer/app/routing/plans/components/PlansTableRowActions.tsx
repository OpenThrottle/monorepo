import * as React from 'react';
import { GlobalPopover } from '@openthrottle/react-router-ui-global';
import type { GlobalPopoverAction } from '@openthrottle/react-router-ui-global';
import { PanelRightIcon, PlayCircleIcon, StopCircle } from 'lucide-react';
import { useNavigation } from 'react-router';
import type { PlanCardFragment } from '~/__generated__/graphql';
import { PLANS_ROW_ACTIONS_COPY } from '~/routing/plans/data/data.copy';
import { getPlanIsCancelable } from '~/routing/plans/utils/utils.plans';

export interface PlansTableRowActionsProps {
  readonly plan: PlanCardFragment;
}

/**
 * @description Per-row Queue (+ optional Kill) menu for the plans index table.
 */
export const PlansTableRowActions = (
  props: PlansTableRowActionsProps,
): React.ReactElement => {
  const { plan } = props;
  const planId = plan.id;
  const title = plan.title ?? 'Untitled';
  const planAction = `/plans/${planId}`;

  // Hooks
  const navigation = useNavigation();

  // Setup
  const isQueuing =
    navigation.state === 'submitting' &&
    navigation.formAction?.endsWith(planAction) === true &&
    navigation.formData?.get('intent') === 'runPlan';
  const isKilling =
    navigation.state === 'submitting' &&
    navigation.formAction?.endsWith(planAction) === true &&
    navigation.formData?.get('intent') === 'cancelPlanRun';

  const showKill = getPlanIsCancelable(plan.status);
  const actions: GlobalPopoverAction[] = [
    {
      icon: <PanelRightIcon aria-hidden={true} className="size-4" />,
      id: 'preview',
      kind: 'link',
      label: PLANS_ROW_ACTIONS_COPY.view,
      to: `/plans/${planId}`,
    },
    {
      action: planAction,
      disabled: isQueuing,
      fields: { intent: 'runPlan' },
      icon: <PlayCircleIcon aria-hidden={true} className="size-3.5 shrink-0" />,
      id: 'runPlan',
      kind: 'submit',
      label: PLANS_ROW_ACTIONS_COPY.queue,
      navigate: false,
      pending: isQueuing,
      pendingLabel: PLANS_ROW_ACTIONS_COPY.queuePendingLabel,
    },
  ];

  if (showKill) {
    actions.push({
      action: planAction,
      confirm: {
        cancelLabel: PLANS_ROW_ACTIONS_COPY.killCancel,
        confirmLabel: PLANS_ROW_ACTIONS_COPY.killConfirm,
        description: (
          <>
            This stops the queued worker job for &quot;{title}&quot;{' '}
            {PLANS_ROW_ACTIONS_COPY.killDescriptionSuffix}
          </>
        ),
        title: PLANS_ROW_ACTIONS_COPY.killTitle,
      },
      destructive: true,
      fields: { intent: 'cancelPlanRun' },
      icon: <StopCircle aria-hidden={true} className="size-3.5 shrink-0" />,
      id: 'cancelPlanRun',
      kind: 'submit',
      label: PLANS_ROW_ACTIONS_COPY.killConfirm,
      navigate: false,
      pending: isKilling,
      pendingLabel: PLANS_ROW_ACTIONS_COPY.killPendingLabel,
      separatorBefore: true,
    });
  }

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalPopover
      actions={actions}
      ariaLabel={`${PLANS_ROW_ACTIONS_COPY.menuAriaLabelPrefix} ${title}`}
    />
  );
};
