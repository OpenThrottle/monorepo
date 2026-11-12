import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { TRAJECTORY_TIMELINE_COPY } from '~/routing/evals/data/data.copy';
import {
  MOCK_SUBAGENT,
  MOCK_TRAJECTORY,
} from '~/routing/evals/data/mock.trajectory';
import { renderEvals } from '~/routing/evals/testing/renderEvals';
import type { TrajectoryToolCallView } from '~/routing/evals/types';
import { buildTrajectoryTimeline } from '~/routing/evals/utils/timeline';

import { TrajectoryToolCall } from '../TrajectoryToolCall';

const viewAt = (
  stepIndex: number,
  callIndex: number,
): TrajectoryToolCallView => {
  const view =
    buildTrajectoryTimeline(MOCK_TRAJECTORY).steps[stepIndex]?.toolCalls[
      callIndex
    ];

  if (view === undefined) {
    throw new Error('fixture is missing the call');
  }

  return view;
};

const renderCall = (view: TrajectoryToolCallView) => {
  return renderEvals(
    <ol>
      <TrajectoryToolCall view={view} />
    </ol>,
  );
};

describe('TrajectoryToolCall Component', () => {
  test('renders the function name with its result directly under the call', () => {
    const component = renderCall(viewAt(1, 0));
    const call = component.getByTestId('TrajectoryToolCall');

    expect(call).toHaveTextContent('Read');
    expect(component.getAllByTestId('TrajectoryToolCallResult')).toHaveLength(
      1,
    );
    expect(component.getByTestId('TrajectoryToolCallResult')).toHaveAttribute(
      'data-error',
      'false',
    );
  });

  test('keeps arguments collapsed to a preview until expanded as JSON', async () => {
    const user = userEvent.setup();
    const component = renderCall(viewAt(1, 0));
    const trigger = component.getByRole('button', {
      name: TRAJECTORY_TIMELINE_COPY.arguments,
    });

    expect(
      component.getByText('{"file_path":"app/routes/plans.tsx"}'),
    ).toBeVisible();

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(
      component.getByText(/"file_path": "app\/routes\/plans.tsx"/),
    ).toBeInTheDocument();
  });

  describe('when the result is an error', () => {
    test('marks the result and the call', () => {
      const component = renderCall(viewAt(1, 1));

      expect(
        component.getByTestId('TrajectoryToolCallErrorBadge'),
      ).toBeInTheDocument();
      expect(component.getByTestId('TrajectoryToolCallResult')).toHaveAttribute(
        'data-error',
        'true',
      );
    });
  });

  describe('when the call was rebuilt from its result', () => {
    test('says so', () => {
      const component = renderCall(viewAt(2, 1));

      expect(
        component.getByTestId('TrajectoryToolCallSynthesized'),
      ).toBeInTheDocument();
    });
  });

  describe('when the call has no result', () => {
    test('shows that nothing was recorded instead of a result block', () => {
      const component = renderCall({ ...viewAt(1, 0), results: [] });

      expect(
        component.queryByTestId('TrajectoryToolCallResult'),
      ).not.toBeInTheDocument();
    });
  });

  describe('when the call spawned a subagent', () => {
    test('renders the subagent collapsed under the call', () => {
      const component = renderCall({
        ...viewAt(2, 0),
        subagents: [MOCK_SUBAGENT],
      });

      expect(component.getByTestId('TrajectorySubagent')).toBeInTheDocument();
      expect(component.queryByTestId('TrajectoryStep')).not.toBeInTheDocument();
    });
  });
});
