import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { RunningIndicator } from '../RunningIndicator';
import type { RunningIndicatorProps } from '../RunningIndicator';
import {
  RUNNING_INDICATOR_SLOW_HINT,
  RUNNING_INDICATOR_SLOW_HINT_AFTER_MS,
  resolveRunningIndicatorCopy,
} from '../../data/chat-run-phase-copy';
import { ChatRunPhase } from '../../types';

const renderIndicator = (props: RunningIndicatorProps = {}): RenderResult =>
  render(<RunningIndicator {...props} />);

describe('resolveRunningIndicatorCopy', () => {
  test('maps each phase to a distinct default label', () => {
    const labels = Object.values(ChatRunPhase).map(
      (phase) => resolveRunningIndicatorCopy({ phase }).label,
    );

    expect(new Set(labels).size).toBe(labels.length);
  });

  test('composes the tool name for the running-tool phase', () => {
    const copy = resolveRunningIndicatorCopy({
      detail: 'shell',
      phase: ChatRunPhase.runningTool,
    });

    expect(copy.label).toBe('Running shell…');
  });

  test('composes the model name for the waiting phase', () => {
    const copy = resolveRunningIndicatorCopy({
      detail: 'claude-opus',
      phase: ChatRunPhase.waiting,
    });

    expect(copy.label).toBe('Waiting for claude-opus…');
  });

  test('falls back to the generic label when detail is blank', () => {
    expect(
      resolveRunningIndicatorCopy({
        detail: '  ',
        phase: ChatRunPhase.runningTool,
      }).label,
    ).toBe('Running a tool…');
  });

  describe('elapsed escalation', () => {
    test('adds the slow hint once a generic wait exceeds the threshold', () => {
      const copy = resolveRunningIndicatorCopy({
        elapsedMs: RUNNING_INDICATOR_SLOW_HINT_AFTER_MS,
        phase: ChatRunPhase.waiting,
      });

      expect(copy.hint).toBe(RUNNING_INDICATOR_SLOW_HINT);
    });

    test('no hint before the threshold', () => {
      expect(
        resolveRunningIndicatorCopy({
          elapsedMs: RUNNING_INDICATOR_SLOW_HINT_AFTER_MS - 1,
          phase: ChatRunPhase.connecting,
        }).hint,
      ).toBeNull();
    });

    test('no hint for a non-generic phase even when slow', () => {
      expect(
        resolveRunningIndicatorCopy({
          elapsedMs: RUNNING_INDICATOR_SLOW_HINT_AFTER_MS * 10,
          phase: ChatRunPhase.runningTool,
        }).hint,
      ).toBeNull();
    });
  });
});

describe('RunningIndicator Component', () => {
  test('defaults to the waiting phase copy and keeps the status affordance', () => {
    const component = renderIndicator();

    const status = component.getByTestId('ChatTurnTimeline-running');
    expect(status).toHaveAttribute('role', 'status');
    expect(status).toHaveTextContent('Waiting for the model…');
  });

  test('renders the composed tool label for the running-tool phase', () => {
    const component = renderIndicator({
      detail: 'getMcpTools',
      phase: ChatRunPhase.runningTool,
    });

    expect(component.getByText('Running getMcpTools…')).toBeInTheDocument();
  });

  test('shows the slow-wait hint after the threshold', () => {
    const component = renderIndicator({
      elapsedMs: RUNNING_INDICATOR_SLOW_HINT_AFTER_MS,
      phase: ChatRunPhase.waiting,
    });

    expect(
      component.getByText(RUNNING_INDICATOR_SLOW_HINT),
    ).toBeInTheDocument();
  });

  test('an explicit label overrides the resolved copy', () => {
    const component = renderIndicator({
      label: 'Custom…',
      phase: ChatRunPhase.thinking,
    });

    expect(component.getByText('Custom…')).toBeInTheDocument();
  });
});
