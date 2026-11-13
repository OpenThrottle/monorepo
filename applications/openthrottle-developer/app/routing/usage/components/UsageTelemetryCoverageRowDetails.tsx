import { formatRelativeChatTimestamp } from '@openthrottle/react-router-chat';
import type { GlobalPopoverAction } from '@openthrottle/react-router-ui-global';
import { GlobalPopover } from '@openthrottle/react-router-ui-global';
import * as React from 'react';

import type { UsageTelemetryCoverageMachineFragment } from '~/__generated__/graphql';
import { TELEMETRY_COVERAGE_COPY } from '~/routing/usage/data/data.telemetry-coverage-copy';
import {
  machineDisplayName,
  repoDisplayName,
  repoLegSummary,
} from '~/routing/usage/utils/telemetry-coverage';

export interface UsageTelemetryCoverageRowDetailsProps {
  readonly className?: string;
  readonly machine: UsageTelemetryCoverageMachineFragment;
  /** Loader clock (ISO), so relative labels match across SSR and hydration. */
  readonly nowIso: string;
}

export const UsageTelemetryCoverageRowDetails = (
  props: UsageTelemetryCoverageRowDetailsProps,
): React.ReactElement => {
  const { className, machine, nowIso } = props;

  // Hooks

  // Setup
  const nowMs = new Date(nowIso).getTime();
  const machineName = machineDisplayName(machine);
  const copy = TELEMETRY_COVERAGE_COPY;

  // Handlers
  const noop = (): void => {};

  const formatRelative = (iso: string): string => {
    return formatRelativeChatTimestamp(iso, nowMs);
  };

  // Markup
  const repoActions: GlobalPopoverAction[] = machine.repos.map(
    (repo, index) => {
      const repoName =
        repoDisplayName(repo.repoIdentity) ?? copy.detailsNoRemote;

      const legSummary = repoLegSummary(repo, formatRelative);
      const label =
        legSummary === '' ? repoName : copy.detailsRepo(repoName, legSummary);

      return {
        id: `repo-${index}`,
        kind: 'select',
        label,
        onSelect: noop,
      };
    },
  );
  const emptyAction: GlobalPopoverAction = {
    disabled: true,
    id: `no-repos`,
    kind: 'select',
    label: copy.detailsNoRepos,
    onSelect: noop,
  };
  const actions = repoActions.length > 0 ? repoActions : [emptyAction];

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalPopover
      actions={actions}
      ariaLabel={copy.detailsAriaLabel(machineName)}
      className={className}
      heading={copy.detailsHeading}
      testId="UsageTelemetryCoverageRowDetails"
    />
  );
};
