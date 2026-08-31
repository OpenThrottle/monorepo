import * as React from 'react';
import { ChatCheckoutSelector } from '@openthrottle/react-router-chat';
import {
  Skeleton,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import type { PlanRunConfigRepositoryFieldsFragment } from '~/__generated__/graphql';
import { PlanDeferredSection } from '~/routing/plans/components/PlanDeferredSection';
import {
  PLAN_CHECKOUT_SELECTOR_COPY,
  PLAN_DEFERRED_SECTION_COPY,
} from '~/routing/plans/data/data.copy';
import { toPlanCheckoutOptions } from '~/routing/plans/utils/plan-checkout-options';

export interface PlanCheckoutSelectorProps {
  /** Registered checkout the plan's run config points at; empty = none. */
  readonly checkoutId: string;
  readonly className?: string;
  /**
   * Icon-only presentation for the dense tabs row: the trigger drops to its
   * folder icon and the healthy state gains an explanatory tooltip.
   */
  readonly minimal?: boolean;
  /**
   * Overrides the default healthy-state hint shown in {@link minimal} mode.
   * Ignored outside minimal mode and outranked by the two failure hints.
   */
  readonly minimalHint?: string;
  readonly onCheckoutChange: (checkoutId: string) => void;
  /**
   * @description The loader's deferred `workspaceRepositories`. Deferred because
   * it is the slow field on this route (~1.3s cold), so it streams in behind its
   * own boundary rather than holding up the tabs row.
   */
  readonly repositories: Promise<
    readonly PlanRunConfigRepositoryFieldsFragment[]
  >;
}

/**
 * @description The plan-detail tabs row's checkout picker — the in-place fix for
 * a plan whose run config has no (or a de-registered) workspace.
 *
 * Such a plan cannot be queued and its editor deep links stay inert, and the
 * only other control that could fix it lives in the Configuration tab, which is
 * gated off. This is the lightweight course-correct; the full workspace selector
 * keeps the custom-path / monorepo-root / branch-field escape hatches.
 *
 * Reuses chat's {@link ChatCheckoutSelector} rather than inventing a third
 * picker, so a workspace holding several checkouts named `monorepo` is
 * disambiguated here exactly the way it is in the composer.
 *
 * Single-select on purpose: a plan run has one cwd (`checkoutId` →
 * `repositoryId` → `workingDirectory` on enqueue), so `multiple` and its
 * context-directory affordance would promise something enqueue cannot honor.
 */
export const PlanCheckoutSelector = (
  props: PlanCheckoutSelectorProps,
): React.ReactElement => {
  const {
    checkoutId,
    className,
    minimal = false,
    minimalHint,
    onCheckoutChange,
    repositories,
  } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup
  const renderResolved = (
    resolved: readonly PlanRunConfigRepositoryFieldsFragment[],
  ): React.ReactNode => {
    const options = toPlanCheckoutOptions(resolved);
    // A selection that is no longer registered must NOT hide the control — that
    // is precisely when the user needs it. `ChatCheckoutSelector` falls back to
    // the placeholder for an unknown id, so the picker stays usable; the hint
    // below explains why the trigger reads as unselected.
    const selectionMissing =
      checkoutId !== '' && !options.some((option) => option.id === checkoutId);

    const selector = (
      <ChatCheckoutSelector
        checkouts={options}
        className={className}
        emptyLabel={PLAN_CHECKOUT_SELECTOR_COPY.emptyLabel}
        minimal={minimal}
        onCheckoutChange={onCheckoutChange}
        placeholder={PLAN_CHECKOUT_SELECTOR_COPY.placeholder}
        selectedCheckoutId={checkoutId}
      />
    );

    const hint =
      options.length === 0
        ? PLAN_CHECKOUT_SELECTOR_COPY.emptyRegistryHint
        : selectionMissing
          ? PLAN_CHECKOUT_SELECTOR_COPY.staleCheckoutHint
          : minimal
            ? (minimalHint ?? PLAN_CHECKOUT_SELECTOR_COPY.minimalHint)
            : undefined;

    // A healthy full-size selector says what it is on its own face, so it gets
    // no tooltip — one would only end up hovering over its own open popover.
    // Minimal mode has no face to read, so there the hover is the only label.
    if (hint === undefined) {
      return <div data-testid="PlanCheckoutSelector">{selector}</div>;
    }

    return (
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild={true}>
          {/* The span carries the pointer events an empty (disabled) trigger
              cannot, so the hint explaining WHY still opens. */}
          <span className="inline-flex" data-testid="PlanCheckoutSelector">
            {selector}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs" side="bottom">
          {hint}
        </TooltipContent>
      </Tooltip>
    );
  };

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <PlanDeferredSection
      errorText={PLAN_DEFERRED_SECTION_COPY.configurationError}
      fallback={
        <Skeleton
          aria-busy="true"
          className="h-8 w-40"
          data-testid="PlanCheckoutSelector-skeleton"
        />
      }
      resolve={repositories}
    >
      {renderResolved}
    </PlanDeferredSection>
  );
};
