import * as React from 'react';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { TerminalSquareIcon } from 'lucide-react';

export interface SettingsLogsIntroProps {}

/**
 * @description Heading, purpose blurb, and privacy caution for the Settings →
 * Logs panel. Split out of SettingsLogsPanel (component-primitive-shape R6).
 */
export const SettingsLogsIntro = (
  _props: SettingsLogsIntroProps,
): React.ReactElement => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div>
      <GlobalHeading
        className="mb-4"
        heading="h3"
        icon={TerminalSquareIcon}
        title="Logs"
      />
      <p className="text-muted-foreground mb-4 text-sm">
        Capture browser console output in this tab, copy lines, and export a
        sanitized support bundle (JSON) with env metadata and log lines. Server
        workflow and agent streams are described below—when an operator API
        exists, optional tailing can plug into the same bundle shape.
      </p>
      <p className="text-foreground mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs">
        Logs may include URLs or user-visible strings. Only copy or export what
        you intend to share; the support bundle redacts env secrets but not
        every substring inside log lines.
      </p>
    </div>
  );
};
