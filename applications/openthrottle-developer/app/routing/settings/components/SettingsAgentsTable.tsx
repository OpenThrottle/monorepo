import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@openthrottle/react-router-shadcn';
import { SETTINGS_AGENTS_COPY } from '~/routing/settings/data/data.copy';
import { SettingsAgentsTableRow } from '~/routing/settings/components/SettingsAgentsTableRow';
import type { AgentCliStatus } from '~/routing/settings/data/agent-clis.data';

export interface SettingsAgentsTableProps {
  /** Server-computed: current user holds SETTINGS_WRITE. */
  canManage: boolean;
  /** Server-computed: OT_AGENT_CLI_INSTALL_ENABLED is on. */
  installEnabled: boolean;
  statuses: readonly AgentCliStatus[];
}

export const SettingsAgentsTable = (
  props: SettingsAgentsTableProps,
): React.ReactElement => {
  const { canManage, installEnabled, statuses } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className="overflow-x-auto rounded-md border"
      data-testid="SettingsAgentsTable"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{SETTINGS_AGENTS_COPY.columnAgent}</TableHead>
            <TableHead>{SETTINGS_AGENTS_COPY.columnStatus}</TableHead>
            <TableHead>{SETTINGS_AGENTS_COPY.columnModels}</TableHead>
            <TableHead>{SETTINGS_AGENTS_COPY.columnEnabled}</TableHead>
            <TableHead>{SETTINGS_AGENTS_COPY.columnActions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {statuses.length === 0 ? (
            <TableRow>
              <TableCell className="text-muted-foreground text-sm" colSpan={5}>
                {SETTINGS_AGENTS_COPY.emptyState}
              </TableCell>
            </TableRow>
          ) : (
            statuses.map((status) => (
              <SettingsAgentsTableRow
                canManage={canManage}
                installEnabled={installEnabled}
                key={status.backend}
                status={status}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
