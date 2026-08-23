import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { ScheduleMcpWarning } from '../ScheduleMcpWarning';

/** Discovery rows as the ScheduleFormAgentClis query returns them. */
const AGENTS = [
  { attachesWorkspaceMcp: true, backend: 'claude' },
  { attachesWorkspaceMcp: true, backend: 'cursor' },
  { attachesWorkspaceMcp: true, backend: 'grok' },
  { attachesWorkspaceMcp: true, backend: 'opencode' },
  // codex is the only driver that cannot reach a workspace's MCP servers.
  { attachesWorkspaceMcp: false, backend: 'codex' },
];

describe('ScheduleMcpWarning', () => {
  test.each(['claude', 'cursor', 'grok', 'opencode'])(
    'renders nothing for %s, which reaches the workspace MCP servers',
    (driverId) => {
      const component = render(
        <ScheduleMcpWarning agentClis={AGENTS} driverId={driverId} />,
      );

      expect(component.queryByTestId('ScheduleMcpWarning')).toBeNull();
    },
  );

  test('warns for codex, which cannot reach the workspace MCP servers', () => {
    const component = render(
      <ScheduleMcpWarning agentClis={AGENTS} driverId="codex" />,
    );

    const warning = component.getByTestId('ScheduleMcpWarning');
    expect(warning).toBeInTheDocument();
    expect(warning.textContent).toContain('cannot reach');
  });

  test('says access is unverifiable — not missing — for a driver discovery did not report', () => {
    const component = render(
      <ScheduleMcpWarning agentClis={AGENTS} driverId="unlisted-cli" />,
    );

    const warning = component.getByTestId('ScheduleMcpWarning');
    expect(warning.textContent).toContain('could not be verified');
    // Must NOT assert a definite negative for something it cannot know.
    expect(warning.textContent).not.toContain('cannot reach');
  });

  test('degrades to unverifiable when discovery itself failed to load', () => {
    const component = render(
      <ScheduleMcpWarning agentClis={undefined} driverId="cursor" />,
    );

    expect(component.getByTestId('ScheduleMcpWarning').textContent).toContain(
      'could not be verified',
    );
  });

  test('is advisory, not an error: uses a polite status role', () => {
    const component = render(
      <ScheduleMcpWarning agentClis={AGENTS} driverId="codex" />,
    );

    expect(component.getByRole('status')).toBeInTheDocument();
    expect(component.queryByRole('alert')).toBeNull();
  });
});
