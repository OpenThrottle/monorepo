import {
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  ScrollArea,
  Spinner,
  toast,
} from '@openthrottle/react-router-shadcn';
import { CircleCheck, CircleX } from 'lucide-react';
import * as React from 'react';

import type {
  AgentSetupMode,
  AgentSetupRunStatus,
} from '~/routing/settings/data/data.agent-clis';
import { SETTINGS_AGENTS_COPY } from '~/routing/settings/data/data.copy';
import {
  getAgentSetupStatusLabel,
  getAgentSetupTitle,
} from '~/routing/settings/utils/agent-setup-status-label';
import { copyText } from '~/routing/settings/utils/settings.support';

export interface SettingsAgentsSetupLogDialogProps {
  /** Display name of the agent CLI, e.g. "OpenCode". */
  readonly agentName: string;
  /** Already-sanitized log text (see `sanitizeAgentSetupLog`). */
  readonly logText: string;
  readonly mode: AgentSetupMode;
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
  readonly status: AgentSetupRunStatus;
}

/**
 * Local-state dialog (not URL-synced GlobalModal) showing one install/update
 * run's output. Closing it never cancels the run — the owner keeps the stream.
 */
export const SettingsAgentsSetupLogDialog = (
  props: SettingsAgentsSetupLogDialogProps,
): React.ReactElement => {
  const { agentName, logText, mode, onOpenChange, open, status } = props;

  // Hooks
  const scrollRootRef = React.useRef<HTMLDivElement>(null);
  const stickToBottomRef = React.useRef(true);

  // Setup
  const title = getAgentSetupTitle(mode, agentName);
  const statusLabel = getAgentSetupStatusLabel(status);
  const isRunning = status.kind === 'running';
  const isEmpty = logText === '';

  // Handlers
  const handleScrollCapture = (event: React.UIEvent<HTMLDivElement>): void => {
    const { target } = event;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    // Follow the tail only while the user is at (or near) the bottom; scrolling
    // up to read pauses auto-scroll until they return.
    const distance =
      target.scrollHeight - target.scrollTop - target.clientHeight;
    stickToBottomRef.current = distance < 24;
  };

  const handleCopy = async (): Promise<void> => {
    const copied = await copyText(logText);
    if (copied) {
      toast.success(SETTINGS_AGENTS_COPY.setupLogCopiedToast);
      return;
    }
    toast.error(SETTINGS_AGENTS_COPY.setupLogCopyFailedToast);
  };

  const handleClose = (): void => {
    onOpenChange(false);
  };

  // Markup
  const statusIconMarkup = {
    failed: <CircleX aria-hidden="true" className="size-4" />,
    running: <Spinner />,
    succeeded: <CircleCheck aria-hidden="true" className="size-4" />,
  }[status.kind];

  const emptyMarkup = (
    <p
      className="text-muted-foreground p-3 text-xs"
      data-testid="SettingsAgentsSetupLogDialogEmpty"
    >
      {SETTINGS_AGENTS_COPY.setupLogEmpty}
    </p>
  );

  const logMarkup = (
    <pre
      className="p-3 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap"
      data-testid="SettingsAgentsSetupLogDialogLog"
    >
      {logText}
    </pre>
  );

  // Life Cycle
  React.useEffect(() => {
    // Re-arm tail-following every time the dialog opens.
    if (open) {
      stickToBottomRef.current = true;
    }
  }, [open]);

  React.useEffect(() => {
    if (!open || !isRunning || !stickToBottomRef.current) {
      return;
    }
    const viewport = scrollRootRef.current?.querySelector(
      '[data-slot="scroll-area-viewport"]',
    );
    if (viewport instanceof HTMLElement) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [isRunning, logText, open]);

  // 🔌 Short Circuit

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="max-w-3xl"
        data-testid="SettingsAgentsSetupLogDialog"
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {SETTINGS_AGENTS_COPY.setupLogDescription}
          </DialogDescription>
        </DialogHeader>

        <div
          className={cn(
            'flex items-center gap-2 text-sm',
            status.kind === 'failed' && 'text-destructive',
            status.kind === 'running' && 'text-muted-foreground',
          )}
          data-status={status.kind}
          data-testid="SettingsAgentsSetupLogDialogStatus"
        >
          {statusIconMarkup}
          <span>{statusLabel}</span>
        </div>

        <ScrollArea
          className="bg-muted/40 h-[60vh] min-w-0 rounded-md border"
          onScrollCapture={handleScrollCapture}
          ref={scrollRootRef}
        >
          {isEmpty ? emptyMarkup : logMarkup}
        </ScrollArea>

        <DialogFooter>
          <Button
            disabled={isEmpty}
            onClick={handleCopy}
            type="button"
            variant="outline"
          >
            {SETTINGS_AGENTS_COPY.setupLogCopyButton}
          </Button>
          <Button onClick={handleClose} type="button">
            {SETTINGS_AGENTS_COPY.setupLogCloseButton}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
