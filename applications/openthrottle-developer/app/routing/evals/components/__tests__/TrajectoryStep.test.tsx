import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { TRAJECTORY_TIMELINE_COPY } from '~/routing/evals/data/data.copy';
import { MOCK_TRAJECTORY } from '~/routing/evals/data/mock.trajectory';
import { renderEvals } from '~/routing/evals/testing/render-evals';
import type { TrajectoryStepView } from '~/routing/evals/types';
import { buildTrajectoryTimeline } from '~/routing/evals/utils/timeline';

import { TrajectoryStep } from '../TrajectoryStep';

const stepAt = (index: number): TrajectoryStepView => {
  const view = buildTrajectoryTimeline(MOCK_TRAJECTORY).steps[index];

  if (view === undefined) {
    throw new Error('fixture is missing the step');
  }

  return view;
};

const renderStep = (view: TrajectoryStepView) => {
  return renderEvals(
    <ol>
      <TrajectoryStep view={view} />
    </ol>,
  );
};

describe('TrajectoryStep Component', () => {
  describe('a user step', () => {
    test('collapses a long prompt past a few lines', () => {
      const component = renderStep(stepAt(0));
      const step = component.getByTestId('TrajectoryStep');

      expect(step).toHaveAttribute('data-source', 'user');
      expect(step).toHaveTextContent('Prompt line 1');
      expect(step).not.toHaveTextContent('Prompt line 10');
      expect(
        component.getByRole('button', { expanded: false }),
      ).toBeInTheDocument();
    });
  });

  describe('an agent step', () => {
    test('keeps reasoning collapsed until opened from the keyboard', async () => {
      const user = userEvent.setup();
      const component = renderStep(stepAt(1));
      const trigger = component.getByRole('button', {
        name: TRAJECTORY_TIMELINE_COPY.reasoning,
      });

      expect(
        component.queryByText('The loader lives in the route module.'),
      ).not.toBeInTheDocument();

      trigger.focus();
      await user.keyboard('{Enter}');

      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(
        component.getByText('The loader lives in the route module.'),
      ).toBeInTheDocument();
    });

    test('renders each tool call and any result that names no call', () => {
      const component = renderStep(stepAt(1));

      expect(component.getAllByTestId('TrajectoryToolCall')).toHaveLength(2);
      expect(
        component.getByText('A stray result with no call.'),
      ).toBeInTheDocument();
    });
  });

  describe('a step with neither message nor calls', () => {
    test('says it is empty', () => {
      const component = renderStep({
        step: { message: '', source: 'agent', step_id: 9 },
        toolCalls: [],
        unmatchedResults: [],
      });

      expect(
        component.getByText(TRAJECTORY_TIMELINE_COPY.emptyMessage),
      ).toBeInTheDocument();
    });
  });
});
