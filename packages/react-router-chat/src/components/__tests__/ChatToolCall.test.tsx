import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { ChatToolCall } from '../ChatToolCall';
import type { ChatToolCallProps } from '../ChatToolCall';
import type { ChatTurnToolEvent } from '../../types';

const toolEvent = (
  overrides: Partial<ChatTurnToolEvent> = {},
): ChatTurnToolEvent => ({
  argsJson: null,
  callId: 'c1',
  error: null,
  kind: 'tool',
  name: 'read',
  resultJson: null,
  sortOrder: 0,
  status: 'running',
  ...overrides,
});

const renderToolCall = (props: ChatToolCallProps): RenderResult =>
  render(<ChatToolCall {...props} />);

describe('ChatToolCall Component', () => {
  test('always shows the tool name in the header', () => {
    const component = renderToolCall({ event: toolEvent() });
    expect(component.getByText('read')).toBeInTheDocument();
  });

  test('renders the real tool name, never a metadata placeholder', () => {
    const component = renderToolCall({
      event: toolEvent({ name: 'view_file' }),
    });
    const trigger = component.getByTestId('ChatToolCall-trigger');

    expect(trigger).toHaveTextContent('view_file');
    // The regression this guards: the header used to read the literal `name`
    // (or the generic `tool`) for every driver but cursor-agent.
    expect(trigger).not.toHaveTextContent(/\bname\b/);
    expect(trigger).not.toHaveTextContent(/\btool\b/);
  });

  test('truncates a long tool name rather than pushing the status pill off the row', () => {
    const component = renderToolCall({
      event: toolEvent({
        name: 'mcp__openthrottle-mcp__get_remaining_tasks_for_plan',
      }),
    });

    expect(
      component.getByText(
        'mcp__openthrottle-mcp__get_remaining_tasks_for_plan',
      ),
    ).toHaveClass('truncate');
    expect(component.getByText('running')).toBeInTheDocument();
  });

  describe('status badge', () => {
    test('running shows a running badge with a spinner', () => {
      const component = renderToolCall({
        event: toolEvent({ status: 'running' }),
      });

      expect(component.getByText('running')).toBeInTheDocument();
      const spinner = component.container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
      // reduced-motion: spinner must not animate when the user opts out.
      // (SVG className is an SVGAnimatedString, so read the class attribute.)
      expect(spinner?.getAttribute('class')).toContain(
        'motion-reduce:animate-none',
      );
    });

    test('succeeded shows a succeeded badge and no spinner', () => {
      const component = renderToolCall({
        event: toolEvent({ status: 'succeeded' }),
      });

      expect(component.getByText('succeeded')).toBeInTheDocument();
      expect(
        component.container.querySelector('.animate-spin'),
      ).not.toBeInTheDocument();
    });

    test('failed shows a failed badge and surfaces the error inline', () => {
      const component = renderToolCall({
        event: toolEvent({ error: 'permission denied', status: 'failed' }),
      });

      expect(component.getByText('failed')).toBeInTheDocument();
      const alert = component.getByRole('alert');
      expect(alert).toHaveTextContent('permission denied');
    });
  });

  describe('args and result payloads', () => {
    test('renders pretty-printed args and result when expanded', () => {
      const component = renderToolCall({
        defaultOpen: true,
        event: toolEvent({
          argsJson: JSON.stringify({ path: 'a.ts' }),
          resultJson: JSON.stringify({ ok: true }),
          status: 'succeeded',
        }),
      });

      expect(component.getByText('Arguments')).toBeInTheDocument();
      expect(component.getByText('Result')).toBeInTheDocument();
      expect(component.container.textContent).toContain('"path": "a.ts"');
      expect(component.container.textContent).toContain('"ok": true');
    });

    test('falls back to the raw string when args are not valid JSON', () => {
      const component = renderToolCall({
        defaultOpen: true,
        event: toolEvent({ argsJson: 'not-json', status: 'succeeded' }),
      });

      expect(component.container.textContent).toContain('not-json');
    });

    // test('bounds large payloads inside a scroll area', () => {
    //   const big = JSON.stringify({ blob: 'x'.repeat(5000) });
    //   const component = renderToolCall({
    //     defaultOpen: true,
    //     event: toolEvent({ resultJson: big, status: 'succeeded' }),
    //   });
    //
    //   expect(
    //     component.container.querySelector('[data-slot="scroll-area"]'),
    //   ).toBeInTheDocument();
    // });

    test('shows an awaiting-result placeholder while running with no payload', () => {
      const component = renderToolCall({
        defaultOpen: true,
        event: toolEvent({ status: 'running' }),
      });

      expect(component.getByText('Awaiting result…')).toBeInTheDocument();
    });
  });

  describe('collapse behavior', () => {
    test('a succeeded call is collapsed by default and expands on click', async () => {
      const user = userEvent.setup();
      const component = renderToolCall({
        event: toolEvent({
          argsJson: JSON.stringify({ path: 'a.ts' }),
          status: 'succeeded',
        }),
      });

      const trigger = component.getByTestId('ChatToolCall-trigger');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');

      await user.click(trigger);

      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(component.getByText('Arguments')).toBeInTheDocument();
    });

    test('a failed call starts expanded', () => {
      const component = renderToolCall({
        event: toolEvent({ error: 'boom', status: 'failed' }),
      });

      expect(component.getByTestId('ChatToolCall-trigger')).toHaveAttribute(
        'aria-expanded',
        'true',
      );
    });
  });
});
