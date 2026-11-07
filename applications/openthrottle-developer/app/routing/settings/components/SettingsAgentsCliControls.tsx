import { Button, cn, Spinner } from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { useFetcher, useRevalidator } from 'react-router';

import type { action as agentSetupAction } from '~/routes/resources.agent-setup';
import { SettingsAgentsSetupLogDialog } from '~/routing/settings/components/SettingsAgentsSetupLogDialog';
import type { AgentCliStatus } from '~/routing/settings/data/data.agent-clis';
import { SETTINGS_AGENTS_COPY } from '~/routing/settings/data/data.copy';
import { useAgentSetupStream } from '~/routing/settings/hooks/useAgentSetupStream';
import { getAgentCliActionLabel } from '~/routing/settings/utils/agent-cli-action-label';
import { sanitizeAgentSetupLog } from '~/routing/settings/utils/agent-setup-log';
import {
  getAgentSetupRowSummary,
  getAgentSetupRunMode,
  getAgentSetupRunStatus,
} from '~/routing/settings/utils/agent-setup-run-status';

/** Resource-route action path backing the install/update controls. */
const AGENT_SETUP_ACTION = '/resources/agent-setup';

export interface SettingsAgentsCliControlsProps {
  /** Server-computed: current user holds SETTINGS_WRITE. */
  canManage: boolean;
  /** Server-computed: OT_AGENT_CLI_INSTALL_ENABLED is on. */
  installEnabled: boolean;
  /** The agent CLI row; its `label` titles the setup log dialog. */
  status: AgentCliStatus;
}

export const SettingsAgentsCliControls = (
  props: SettingsAgentsCliControlsProps,
): React.ReactElement => {
  const { canManage, installEnabled, status } = props;

  // Hooks
  const fetcher = useFetcher<typeof agentSetupAction>();
  const revalidator = useRevalidator();
  const [logOpen, setLogOpen] = React.useState(false);

  // Setup
  const intent = status.installed ? 'update' : 'install';
  const runId = fetcher.data?.runId ?? null;
  const stream = useAgentSetupStream(runId);
  const submitting = fetcher.state !== 'idle';
  const running = runId != null && !stream.done;

  // The OT_AGENT_CLI_INSTALL_ENABLED explanation lives once at the route level
  // (SettingsAgentsInstallNotice); here we only surface the contextual per-row
  // permission reason. The button is still disabled when the env flag is off.
  const { permissionReason: noPermissionCopy } = SETTINGS_AGENTS_COPY;
  const permissionReason = canManage ? null : noPermissionCopy;
  const disabled =
    permissionReason != null || !installEnabled || submitting || running;

  const serverDisabled = fetcher.data?.disabled === true;
  const actionLabel = getAgentCliActionLabel({
    installed: status.installed,
    running,
  });

  const rawLog = stream.chunks.map((chunk) => chunk.data).join('');
  const logText = sanitizeAgentSetupLog(rawLog);
  const runStatus = getAgentSetupRunStatus(stream);
  const runMode = getAgentSetupRunMode(fetcher.data?.mode, intent);
  const summary = getAgentSetupRowSummary(runStatus, logText);
  const hasRun = runId != null;
  // A start that never produced a run (rejected/errored) has no log to open,
  // so its message renders inline instead.
  const startError = fetcher.data?.errorMessage ?? null;
  const showStartError = !hasRun && startError != null && !serverDisabled;

  // Handlers
  const handleViewLog = (): void => {
    setLogOpen(true);
  };

  // Markup
  const permissionMarkup = (
    <p className="text-muted-foreground mt-2 text-xs">{permissionReason}</p>
  );
  const startErrorMarkup = (
    <p className="text-destructive mt-2 text-xs">{startError}</p>
  );
  const runMarkup = (
    <>
      <span
        className={cn(
          'text-muted-foreground min-w-0 truncate text-xs',
          runStatus.kind === 'failed' && 'text-destructive',
        )}
        data-status={runStatus.kind}
        data-testid="SettingsAgentsCliControlsStatus"
        title={summary}
      >
        {summary}
      </span>
      <Button
        className="shrink-0"
        onClick={handleViewLog}
        size="sm"
        type="button"
        variant="ghost"
      >
        {SETTINGS_AGENTS_COPY.setupLogViewButton}
      </Button>
      <SettingsAgentsSetupLogDialog
        agentName={status.label}
        logText={logText}
        mode={runMode}
        onOpenChange={setLogOpen}
        open={logOpen}
        status={runStatus}
      />
    </>
  );

  // Life Cycle
  React.useEffect(() => {
    // A new run auto-opens its log; closing the dialog never cancels the run.
    if (runId != null) {
      setLogOpen(true);
    }
  }, [runId]);

  const revalidatedRunRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    // Once a run finishes cleanly, refetch the loader so the card re-reflects
    // installed/version state. Guard by runId so it fires once per run.
    if (runId != null && stream.done && stream.error == null) {
      if (revalidatedRunRef.current !== runId) {
        revalidatedRunRef.current = runId;
        revalidator.revalidate();
      }
    }
  }, [runId, stream.done, stream.error, revalidator]);

  // 🔌 Short Circuit

  return (
    <div className="w-full min-w-0" data-testid="SettingsAgentsCliControls">
      <div className="flex min-w-0 items-center gap-2">
        <fetcher.Form
          action={AGENT_SETUP_ACTION}
          className="shrink-0"
          method="post"
        >
          <input name="backend" type="hidden" value={status.backend} />
          <input name="intent" type="hidden" value={intent} />
          <Button disabled={disabled} size="sm" type="submit" variant="outline">
            {running ? <Spinner className="mr-2" /> : null}
            {actionLabel}
          </Button>
        </fetcher.Form>

        {hasRun ? runMarkup : null}
      </div>

      {permissionReason != null ? permissionMarkup : null}

      {showStartError ? startErrorMarkup : null}
    </div>
  );
};
