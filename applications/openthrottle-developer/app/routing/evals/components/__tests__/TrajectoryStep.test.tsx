import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { TRAJECTORY_TIMELINE_COPY } from '~/routing/evals/data/data.copy';
import { STEP_SOURCE_LABEL } from '~/routing/evals/data/data.step-source';
import {
  MOCK_SUBAGENT_ID,
  MOCK_TRAJECTORY,
} from '~/routing/evals/data/mock.trajectory';
import { renderEvals } from '~/routing/evals/testing/renderEvals';
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
    test('labels the source and collapses a long prompt past a few lines', () => {
      const component = renderStep(stepAt(0));
      const step = component.getByTestId('TrajectoryStep');

      expect(step).toHaveAttribute('data-source', 'user');
      expect(
        component.getByLabelText(STEP_SOURCE_LABEL.user),
      ).toBeInTheDocument();
      expect(step).toHaveTextContent('Prompt line 1');
      expect(step).not.toHaveTextContent('Prompt line 10');
      expect(
        component.getByRole('button', { expanded: false }),
      ).toBeInTheDocument();
    });
  });

  describe('an agent step', () => {
    test('labels the source and keeps reasoning collapsed until opened', async () => {
      const user = userEvent.setup();
      const component = renderStep(stepAt(1));
      const trigger = component.getByRole('button', {
        name: TRAJECTORY_TIMELINE_COPY.reasoning,
      });

      expect(component.getByTestId('TrajectoryStep')).toHaveAttribute(
        'data-source',
        'agent',
      );
      expect(
        component.getByLabelText(STEP_SOURCE_LABEL.agent),
      ).toBeInTheDocument();
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

  describe('a system hand-back step', () => {
    test('labels the source and expands the named subagent trajectory', async () => {
      const user = userEvent.setup();
      const component = renderStep(stepAt(3));
      const step = component.getByTestId('TrajectoryStep');

      expect(step).toHaveAttribute('data-source', 'system');
      expect(
        component.getByLabelText(STEP_SOURCE_LABEL.system),
      ).toBeInTheDocument();
      expect(component.getByTestId('TrajectorySubagent')).toHaveAttribute(
        'id',
        `trajectory-subagent-${MOCK_SUBAGENT_ID}`,
      );

      await user.click(component.getByRole('button', { expanded: false }));

      expect(component.getAllByTestId('TrajectoryStep').length).toBeGreaterThan(
        1,
      );
    });
  });

  describe('a system notification step', () => {
    test('labels the source without a linked subagent', () => {
      const component = renderStep(stepAt(4));

      expect(component.getByTestId('TrajectoryStep')).toHaveAttribute(
        'data-source',
        'system',
      );
      expect(
        component.getByLabelText(STEP_SOURCE_LABEL.system),
      ).toBeInTheDocument();
      expect(
        component.queryByTestId('TrajectorySubagent'),
      ).not.toBeInTheDocument();
    });
  });

  describe('a step with neither message nor calls', () => {
    test('says it is empty', () => {
      const component = renderStep({
        linkedSubagents: [],
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
