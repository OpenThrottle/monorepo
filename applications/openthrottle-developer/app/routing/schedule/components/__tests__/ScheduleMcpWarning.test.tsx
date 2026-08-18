import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { ScheduleMcpWarning } from '../ScheduleMcpWarning';

/** Discovery rows as the ScheduleFormAgentClis query returns them. */
const AGENTS = [
  { attachesWorkspaceMcp: true, backend: 'claude' },
  { attachesWorkspaceMcp: true, backend: 'cursor' },
  { attachesWorkspaceMcp: true, backend: 'opencode' },
  { attachesWorkspaceMcp: false, backend: 'codex' },
  { attachesWorkspaceMcp: false, backend: 'grok' },
];

describe('ScheduleMcpWarning', () => {
  test.each(['claude', 'cursor', 'opencode'])(
    'renders nothing for %s, which reaches the workspace MCP servers',
    (driverId) => {
      const component = render(
        <ScheduleMcpWarning agentClis={AGENTS} driverId={driverId} />,
      );

      expect(component.queryByTestId('ScheduleMcpWarning')).toBeNull();
    },
  );

  test.each(['codex', 'grok'])(
    'warns for %s, which cannot reach the workspace MCP servers',
    (driverId) => {
      const component = render(
        <ScheduleMcpWarning agentClis={AGENTS} driverId={driverId} />,
      );

      const warning = component.getByTestId('ScheduleMcpWarning');
      expect(warning).toBeInTheDocument();
      expect(warning.textContent).toContain('cannot reach');
    },
  );

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
