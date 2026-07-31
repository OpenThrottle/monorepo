import * as React from 'react';
import { OpenThrottleFieldset } from '@openthrottle/react-router-ui';
import { DEFAULT_SETTINGS_LOGS_DOC } from '~/routing/settings/config/defaults';

export interface SettingsLogsServerStreamsProps {}

/**
 * @description "Workflow & Server Logs" fieldset explaining the not-yet-wired
 * server/agent log streams and the future API contract sketch. Split out of
 * SettingsLogsPanel (component-primitive-shape R6).
 */
export const SettingsLogsServerStreams = (
  _props: SettingsLogsServerStreamsProps,
): React.ReactElement => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <OpenThrottleFieldset
      id="workflow-agent-logs"
      legend="Workflow & Server Logs"
    >
      <div className="text-muted-foreground space-y-3 text-sm">
        <p>
          A tail or subscription to workflow-ralph stderr, queue worker logs, or
          plan-output streams is not wired to this UI yet. Until an
          authenticated operator API exposes those streams, use Plan detail for
          OpenThrottle output and capture CLI stderr per{' '}
          <a
            className="text-primary underline-offset-4 hover:underline"
            href={DEFAULT_SETTINGS_LOGS_DOC}
            rel="noreferrer"
            target="_blank"
          >
            tools/workflows README
          </a>
          .
        </p>
        <p className="text-xs">
          Future API contract (sketch): query or SSE scoped to the signed-in
          operator; correlation IDs linking queue jobs, plan IDs, and task IDs;
          no raw secrets in payloads.
        </p>
      </div>
    </OpenThrottleFieldset>
  );
};
