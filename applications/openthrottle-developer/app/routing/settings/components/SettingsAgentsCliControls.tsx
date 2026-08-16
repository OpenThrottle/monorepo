import * as React from 'react';
import { useFetcher, useRevalidator } from 'react-router';
import { Button, Spinner } from '@openthrottle/react-router-shadcn';
import { useAgentSetupStream } from '~/routing/settings/hooks/useAgentSetupStream';
import { SETTINGS_AGENTS_COPY } from '~/routing/settings/data/data.copy';
import type { AgentCliStatus } from '~/routing/settings/data/agent-clis.data';
import type { action as agentSetupAction } from '~/routes/resources.agent-setup';

/** Resource-route action path backing the install/update controls. */
const AGENT_SETUP_ACTION = '/resources/agent-setup';

export interface SettingsAgentsCliControlsProps {
  /** Server-computed: current user holds SETTINGS_WRITE. */
  canManage: boolean;
  /** Server-computed: OT_AGENT_CLI_INSTALL_ENABLED is on. */
  installEnabled: boolean;
  status: AgentCliStatus;
}

export const SettingsAgentsCliControls = (
  props: SettingsAgentsCliControlsProps,
): React.ReactElement => {
  const { canManage, installEnabled, status } = props;

  // Hooks
  const fetcher = useFetcher<typeof agentSetupAction>();
  const revalidator = useRevalidator();

  // Setup
  const intent = status.installed ? 'update' : 'install';
  const runId = fetcher.data?.runId ?? null;
  const stream = useAgentSetupStream(runId);
  const submitting = fetcher.state !== 'idle';
  const running = runId != null && !stream.done;

  // The OT_AGENT_CLI_INSTALL_ENABLED explanation lives once at the route level
  // (SettingsAgentsInstallNotice); here we only surface the contextual per-row
  // permission reason. The button is still disabled when the env flag is off.
  const permissionReason = !canManage
    ? SETTINGS_AGENTS_COPY.permissionReason
    : null;
  const disabled =
    permissionReason != null || !installEnabled || submitting || running;

  const serverDisabled = fetcher.data?.disabled === true;
  const errorMessage = stream.error ?? fetcher.data?.errorMessage ?? null;
  const logText = stream.chunks.map((chunk) => chunk.data).join('');

  // Handlers

  // Markup

  // Life Cycle
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
    <div className="w-full" data-testid="SettingsAgentsCliControls">
      <fetcher.Form action={AGENT_SETUP_ACTION} method="post">
        <input name="backend" type="hidden" value={status.backend} />
        <input name="intent" type="hidden" value={intent} />
        <Button disabled={disabled} size="sm" type="submit" variant="outline">
          {running ? <Spinner className="mr-2" /> : null}
          {running
            ? status.installed
              ? 'Updating…'
              : 'Installing…'
            : status.installed
              ? 'Update'
              : 'Install'}
        </Button>
      </fetcher.Form>

      {permissionReason != null ? (
        <p className="text-muted-foreground mt-2 text-xs">{permissionReason}</p>
      ) : null}

      {runId != null && logText !== '' ? (
        <pre
          className="bg-muted/40 mt-2 max-h-48 overflow-auto rounded-md p-2 font-mono text-xs leading-relaxed"
          data-testid="SettingsAgentsCliControlsLog"
        >
          {logText}
        </pre>
      ) : null}

      {errorMessage != null && !serverDisabled ? (
        <p className="text-destructive mt-2 text-xs">{errorMessage}</p>
      ) : null}
    </div>
  );
};
