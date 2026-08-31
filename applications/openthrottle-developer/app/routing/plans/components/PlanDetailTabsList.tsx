import * as React from 'react';
import { TabsList, TabsTrigger } from '@openthrottle/react-router-shadcn';
import {
  BoltIcon,
  CogIcon,
  LayoutListIcon,
  TerminalSquareIcon,
} from 'lucide-react';
import type {
  PlanRunConfigRepositoryFieldsFragment,
  WorkspaceEditorId,
} from '~/__generated__/graphql';
import { PlanCheckoutSelector } from '~/routing/plans/components/PlanCheckoutSelector';
import { PlanEditorActions } from '~/routing/plans/components/PlanEditorActions';

export interface PlanDetailTabsListProps {
  /** Registered checkout the plan's run config points at; empty = none. */
  readonly checkoutId: string;
  readonly editorWorkingDirectory: string;
  readonly editors?: Promise<readonly WorkspaceEditorId[]>;
  readonly onCheckoutChange: (checkoutId: string) => void;
  readonly planId: string;
  readonly repositories: Promise<
    readonly PlanRunConfigRepositoryFieldsFragment[]
  >;
  readonly resolvedTaskCount: number;
  /** The Configuration tab is gated off; kept as a prop, not deleted. */
  readonly showConfiguration: boolean;
  readonly taskCount: number;
}

/**
 * @description The plan-detail tab bar: the three always-on tabs, then a spacer
 * pushing the workspace controls — editor deep links and the checkout picker —
 * to the trailing edge.
 *
 * Extracted from `PlanDetailRoute`, which sits at the 210-line component cap;
 * the row is also where every workspace affordance now lives, so it earns its
 * own file rather than being an arbitrary slice.
 */
export const PlanDetailTabsList = (
  props: PlanDetailTabsListProps,
): React.ReactElement => {
  const {
    checkoutId,
    editorWorkingDirectory,
    editors,
    onCheckoutChange,
    planId,
    repositories,
    resolvedTaskCount,
    showConfiguration,
    taskCount,
  } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <TabsList
      className="mb-8 w-full max-w-full justify-start gap-4 overflow-x-auto overflow-y-hidden"
      variant="line"
    >
      <TabsTrigger
        className="flex-0 cursor-pointer"
        id="plan-tab-overview"
        value="overview"
      >
        <BoltIcon />
        Details
      </TabsTrigger>
      <TabsTrigger
        className="flex-0 cursor-pointer"
        id="plan-tab-tasks"
        value="tasks"
      >
        <LayoutListIcon />
        Tasks ({resolvedTaskCount}/{taskCount})
      </TabsTrigger>
      <TabsTrigger
        className="flex-0 cursor-pointer"
        id="plan-tab-output"
        value="output"
      >
        <TerminalSquareIcon />
        Output
      </TabsTrigger>
      <div className="flex-1" />
      <PlanEditorActions
        editors={editors}
        planId={planId}
        workingDirectory={editorWorkingDirectory}
      />
      {/* The in-place fix for a plan with no workspace: without it the only
          control that can set one lives in the gated-off Configuration tab.
          Icon-only here — it is rarely touched, and its full `owner/repo ·
          branch` face crowded a row that already carries three tabs, the editor
          actions and Configuration. `shrink-0` keeps the square button square
          when the row starts scrolling. */}
      <PlanCheckoutSelector
        checkoutId={checkoutId}
        className="shrink-0"
        minimal={true}
        onCheckoutChange={onCheckoutChange}
        repositories={repositories}
      />
      {showConfiguration ? (
        <TabsTrigger
          className="flex-0 cursor-pointer"
          id="plan-tab-configuration"
          value="configuration"
        >
          <CogIcon />
          Configuration
        </TabsTrigger>
      ) : null}
    </TabsList>
  );
};
