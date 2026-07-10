import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { PlanWorkflowConfigTuning } from '../PlanWorkflowConfigTuning';
import type { PlanWorkflowConfigTuningProps } from '../PlanWorkflowConfigTuning';
import {
  DEFAULT_RALPH_ITERATIONS,
  getDefaultWorkflowRalphRunOptionsInput,
} from '~/routing/plans/utils/build-workflow-ralph-argv';

describe('PlanWorkflowConfigTuning Component', () => {
  let props: PlanWorkflowConfigTuningProps;

  beforeEach(() => {
    props = {
      heading: '07. Run Tuning',
      input: getDefaultWorkflowRalphRunOptionsInput(),
      iterationTimeoutText: '',
      setInput: vi.fn(),
      setIterationTimeoutText: vi.fn(),
    };
  });

  test('should render run tuning fieldset with tuning controls', () => {
    const Component = () => <PlanWorkflowConfigTuning {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(
      component.getByRole('group', { name: '07. Run Tuning' }),
    ).toBeInTheDocument();
    expect(
      component.getByLabelText('Iteration count for --iterations'),
    ).toBeInTheDocument();
    expect(
      component.getByLabelText(
        'Per-iteration timeout in seconds for --iteration-timeout',
      ),
    ).toBeInTheDocument();
    expect(
      component.getByLabelText('Cursor model for --model'),
    ).toBeInTheDocument();
    expect(
      component.getByLabelText('NX project name for --project'),
    ).toBeInTheDocument();
  });

  test('should call setIterationTimeoutText when iteration timeout input changes', async () => {
    const user = userEvent.setup();
    const setIterationTimeoutText = vi.fn();
    props = {
      ...props,
      setIterationTimeoutText,
    };
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => <PlanWorkflowConfigTuning {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByLabelText } = render(<RoutesStub />);

    await user.type(
      getByLabelText(
        'Per-iteration timeout in seconds for --iteration-timeout',
      ),
      '1800',
    );

    expect(setIterationTimeoutText.mock.calls.map((c) => c[0]).join('')).toBe(
      '1800',
    );
  });

  describe('when iterations input blurs with a value below 1', () => {
    test('should reset iterations to default via setInput', async () => {
      const user = userEvent.setup();
      const setInput = vi.fn();
      const invalidInput = {
        ...getDefaultWorkflowRalphRunOptionsInput(),
        iterations: 0,
      };
      props = {
        heading: '07. Run Tuning',
        input: invalidInput,
        iterationTimeoutText: '',
        setInput,
        setIterationTimeoutText: vi.fn(),
      };
      // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
      const Component = () => <PlanWorkflowConfigTuning {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      const { getByLabelText } = render(<RoutesStub />);

      await user.click(getByLabelText('Iteration count for --iterations'));
      await user.tab();

      expect(setInput).toHaveBeenCalled();
      const updater = setInput.mock.calls[0]?.[0];
      expect(typeof updater).toBe('function');
      if (typeof updater === 'function') {
        const next = updater(invalidInput);
        expect(next.iterations).toBe(DEFAULT_RALPH_ITERATIONS);
      }
    });
  });
});
