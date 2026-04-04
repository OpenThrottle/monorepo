import * as React from 'react';
import { fireEvent, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getDefaultStore } from 'jotai/vanilla';
import { createRoutesStub } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { PlanWorkflowConfig } from '../PlanWorkflowConfig';
import type { PlanWorkflowConfigProps } from '../PlanWorkflowConfig';
import { resetWorkflowRunToDefaultsAtom } from '~/routing/plans/data/atom.plan';
import type { WorkflowRalphRunOptionsInput } from '~/routing/plans/utils/build-workflow-ralph-argv';
import {
  DEFAULT_RALPH_MODEL,
  getDefaultWorkflowRalphRunOptionsInput,
} from '~/routing/plans/utils/build-workflow-ralph-argv';

describe('PlanWorkflowConfig Component', () => {
  /** Value passed to `document.execCommand('copy')` via OpenThrottleClipboard fallback (jsdom has no Clipboard API by default). */
  let lastCopiedViaExecCommand: string;

  beforeEach(() => {
    getDefaultStore().set(resetWorkflowRunToDefaultsAtom, undefined);
    lastCopiedViaExecCommand = '';
    /** Prefer execCommand fallback so we can assert copied text without async Clipboard mocks. */
    vi.stubGlobal('navigator', {
      ...globalThis.navigator,
      clipboard: undefined,
    });
    document.execCommand = vi.fn().mockImplementation((command: string) => {
      if (command === 'copy') {
        lastCopiedViaExecCommand =
          document.querySelector('textarea')?.value ?? '';
      }
      return true;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test('should render workflow run options region with CLI preview', () => {
    const props: PlanWorkflowConfigProps = {};
    const Component = () => <PlanWorkflowConfig {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    const component = render(<RoutesStub />);

    expect(component.getByTestId('PlanWorkflowConfig')).toBeInTheDocument();
    expect(
      component.getByRole('heading', {
        level: 2,
        name: 'Workflow configuration',
      }),
    ).toBeInTheDocument();
    expect(component.getByTestId('workflow-run-cli-preview')).toHaveTextContent(
      'pnpm exec workflow-ralph',
    );
    expect(
      component.getByRole('button', { name: 'Copy canonical command' }),
    ).toBeInTheDocument();
  });

  test('should seed plan id when planId prop is set', () => {
    const props: PlanWorkflowConfigProps = {
      planId: '0c2720a9-920f-4b16-865a-f803eb444e18',
    };
    const Component = () => <PlanWorkflowConfig {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByTestId } = render(<RoutesStub />);

    expect(getByTestId('workflow-run-plan-id-input')).toHaveValue(
      '0c2720a9-920f-4b16-865a-f803eb444e18',
    );
  });

  test('should copy canonical CLI including --plan when copy is activated', () => {
    const props: PlanWorkflowConfigProps = {
      planId: '0c2720a9-920f-4b16-865a-f803eb444e18',
    };
    const Component = () => <PlanWorkflowConfig {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByRole } = render(<RoutesStub />);

    fireEvent.click(getByRole('button', { name: 'Copy canonical command' }));

    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(lastCopiedViaExecCommand).toBe(
      'pnpm exec workflow-ralph --plan 0c2720a9-920f-4b16-865a-f803eb444e18',
    );
  });

  test('should update CLI preview when --model is changed from default', async () => {
    const user = userEvent.setup();
    const props: PlanWorkflowConfigProps = {
      planId: '0c2720a9-920f-4b16-865a-f803eb444e18',
    };
    const Component = () => <PlanWorkflowConfig {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByLabelText, getByTestId } = render(<RoutesStub />);

    const modelInput = getByLabelText('Cursor model for --model');
    await user.clear(modelInput);
    await user.type(modelInput, 'fast');

    expect(getByTestId('workflow-run-cli-preview')).toHaveTextContent(
      '--model fast',
    );
    expect(getByTestId('workflow-run-cli-preview')).toHaveTextContent(
      '--plan 0c2720a9-920f-4b16-865a-f803eb444e18',
    );
  });

  test('should show UUID warning when plan id is not a valid Cortex UUID', async () => {
    const user = userEvent.setup();
    const props: PlanWorkflowConfigProps = {};
    const Component = () => <PlanWorkflowConfig {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByLabelText, getByRole } = render(<RoutesStub />);

    const planInput = getByLabelText('Cortex plan UUID for --plan');
    await user.clear(planInput);
    await user.type(planInput, 'not-a-valid-uuid');

    expect(getByRole('alert')).toHaveTextContent(
      'Value does not match a Cortex UUID (v4) pattern',
    );
  });

  test('should switch run target to task mode and show --task input', async () => {
    const user = userEvent.setup();
    const props: PlanWorkflowConfigProps = {};
    const Component = () => <PlanWorkflowConfig {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { findByRole, getByLabelText, getByRole, getByTestId } = render(
      <RoutesStub />,
    );

    await user.click(
      getByRole('combobox', { name: 'Cortex run target: plan or task' }),
    );
    const taskOption = await findByRole('option', { name: /Cortex task/ });
    await user.click(taskOption);

    expect(getByTestId('workflow-run-task-id-input')).toBeInTheDocument();
    expect(getByLabelText('Cortex task UUID for --task')).toBeInTheDocument();
  });

  test('should include --iteration-timeout in CLI preview when uncontrolled timeout text is set', async () => {
    const user = userEvent.setup();
    const props: PlanWorkflowConfigProps = {
      planId: '0c2720a9-920f-4b16-865a-f803eb444e18',
    };
    const Component = () => <PlanWorkflowConfig {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByLabelText, getByTestId } = render(<RoutesStub />);

    await user.type(
      getByLabelText(
        'Per-iteration timeout in seconds for --iteration-timeout',
      ),
      '1800',
    );

    expect(getByTestId('workflow-run-cli-preview')).toHaveTextContent(
      '--iteration-timeout',
    );
    expect(getByTestId('workflow-run-cli-preview')).toHaveTextContent('1800');
  });

  test('should include iteration timeout in controlled CLI preview when parent supplies iterationTimeoutText', () => {
    const planId = '0c2720a9-920f-4b16-865a-f803eb444e18';
    const value = getDefaultWorkflowRalphRunOptionsInput({ planId });

    const RoutesStub = createRoutesStub([
      {
        Component: () => (
          <PlanWorkflowConfig
            iterationTimeoutText="900"
            onIterationTimeoutTextChange={() => {}}
            onValueChange={() => {}}
            planId={planId}
            value={value}
          />
        ),
        path: '/',
      },
    ]);

    const { getByTestId } = render(<RoutesStub />);
    const preview = getByTestId('workflow-run-cli-preview').textContent ?? '';
    expect(preview).toContain('--iteration-timeout');
    expect(preview).toContain('900');
  });

  test('should reflect a second option profile when controlled value changes (Task 2 vs Task 3)', () => {
    const planId = '0c2720a9-920f-4b16-865a-f803eb444e18';
    const optionsAfterTask2: WorkflowRalphRunOptionsInput = {
      ...getDefaultWorkflowRalphRunOptionsInput({ planId }),
      model: 'fast',
    };
    const optionsAfterTask3: WorkflowRalphRunOptionsInput = {
      ...getDefaultWorkflowRalphRunOptionsInput({ planId }),
      debugCli: 'verbose',
      iterations: 3,
      model: DEFAULT_RALPH_MODEL,
    };

    const makeRoutesStub = (value: WorkflowRalphRunOptionsInput) =>
      createRoutesStub([
        {
          Component: () => {
            const [iterationTimeoutText, setIterationTimeoutText] =
              React.useState('');
            return (
              <PlanWorkflowConfig
                iterationTimeoutText={iterationTimeoutText}
                onIterationTimeoutTextChange={setIterationTimeoutText}
                onValueChange={() => {}}
                planId={planId}
                value={value}
              />
            );
          },
          path: '/',
        },
      ]);

    const Stub2 = makeRoutesStub(optionsAfterTask2);
    const { getByTestId, unmount } = render(<Stub2 />);
    const preview2 = getByTestId('workflow-run-cli-preview').textContent ?? '';
    expect(preview2).toContain('--model fast');
    expect(preview2).not.toContain('--iterations');
    unmount();

    const Stub3 = makeRoutesStub(optionsAfterTask3);
    const { getByTestId: getPreview3 } = render(<Stub3 />);
    const preview3 = getPreview3('workflow-run-cli-preview').textContent ?? '';
    expect(preview3).toContain('--iterations 3');
    expect(preview3).toContain('--verbose');
    expect(preview3).not.toContain('--model');
  });

  test('should call onResetToDefaults when Reset to defaults is activated', async () => {
    const user = userEvent.setup();
    const planId = '0c2720a9-920f-4b16-865a-f803eb444e18';
    const onReset = vi.fn();
    const optionsAfterChange: WorkflowRalphRunOptionsInput = {
      ...getDefaultWorkflowRalphRunOptionsInput({ planId }),
      model: 'fast',
    };

    const RoutesStub = createRoutesStub([
      {
        Component: () => {
          const [iterationTimeoutText, setIterationTimeoutText] =
            React.useState('');
          return (
            <PlanWorkflowConfig
              iterationTimeoutText={iterationTimeoutText}
              onCollapse={() => {}}
              onIterationTimeoutTextChange={setIterationTimeoutText}
              onResetToDefaults={onReset}
              onValueChange={() => {}}
              planId={planId}
              value={optionsAfterChange}
            />
          );
        },
        path: '/',
      },
    ]);

    const { getByTestId } = render(<RoutesStub />);
    await user.click(getByTestId('workflow-run-options-reset'));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  describe('accessibility of primary controls', () => {
    test('exposes labeled inputs for plan target and prompt profile', () => {
      const props: PlanWorkflowConfigProps = {
        planId: '0c2720a9-920f-4b16-865a-f803eb444e18',
      };
      const Component = () => <PlanWorkflowConfig {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      const { getByLabelText } = render(<RoutesStub />);

      expect(getByLabelText('Cortex plan UUID for --plan')).toBeInTheDocument();
      expect(getByLabelText('Prompt profile for --prompt')).toBeInTheDocument();
      expect(
        getByLabelText('Cortex run target: plan or task'),
      ).toBeInTheDocument();
    });

    test('titles the card section for screen readers via heading', () => {
      const Component = () => <PlanWorkflowConfig />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      const { getByRole } = render(<RoutesStub />);

      expect(
        getByRole('heading', { level: 2, name: 'Workflow configuration' }),
      ).toHaveAttribute('id', 'workflow-run-options-title');
    });
  });
});
