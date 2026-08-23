import * as React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { getDefaultStore } from 'jotai/vanilla';
import { createRoutesStub } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { PlanWorkflowCommand } from '../PlanWorkflowCommand';
import type { PlanWorkflowCommandProps } from '../PlanWorkflowCommand';
import { resetWorkflowRunToDefaultsAtom } from '~/routing/plans/data/atom.plan';

describe('PlanWorkflowCommand Component', () => {
  /** Value passed to `document.execCommand('copy')` via OpenThrottleClipboard fallback (jsdom has no Clipboard API by default). */
  let lastCopiedViaExecCommand: string;

  beforeEach(() => {
    getDefaultStore().set(resetWorkflowRunToDefaultsAtom, undefined);
    lastCopiedViaExecCommand = '';
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

  test('should render CLI preview from atom and copy control', () => {
    const planId = '0c2720a9-920f-4b16-865a-f803eb444e18';
    getDefaultStore().set(resetWorkflowRunToDefaultsAtom, { planId });

    const props: PlanWorkflowCommandProps = {};
    const Component = () => <PlanWorkflowCommand {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByTestId, getByRole } = render(<RoutesStub />);

    expect(getByTestId('PlanWorkflowCommand')).toBeInTheDocument();
    expect(getByTestId('workflow-run-cli-preview')).toHaveTextContent(
      'pnpm exec workflow-ralph',
    );
    expect(getByTestId('workflow-run-cli-preview')).toHaveTextContent(
      `--plan ${planId}`,
    );
    // The shared defaults put --verbose and the derived worktree in the preview, so match on the
    // stable prefix rather than the whole line.
    expect(
      getByRole('button', {
        name: new RegExp(`^pnpm exec workflow-ralph --plan ${planId}`),
      }),
    ).toBeInTheDocument();
    expect(getByTestId('workflow-run-cli-preview')).toHaveTextContent(
      '--verbose',
    );
    expect(getByTestId('workflow-run-cli-preview')).toHaveTextContent(
      '--worktree plan-0c2720a9',
    );
  });

  test('should use canonicalCommandLineOverride when provided', () => {
    const props: PlanWorkflowCommandProps = {
      command:
        'pnpm exec workflow-ralph --plan 11111111-1111-4111-8111-111111111111 --model fast',
    };
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => <PlanWorkflowCommand {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByTestId } = render(<RoutesStub />);

    expect(getByTestId('workflow-run-cli-preview')).toHaveTextContent(
      props.command ?? '',
    );
  });

  test('should copy canonical CLI when copy is activated', () => {
    const line =
      'pnpm exec workflow-ralph --plan 0c2720a9-920f-4b16-865a-f803eb444e18';
    const props: PlanWorkflowCommandProps = {
      command: line,
    };
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => <PlanWorkflowCommand {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByRole } = render(<RoutesStub />);

    fireEvent.click(getByRole('button', { name: line }));

    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(lastCopiedViaExecCommand).toBe(line);
  });
});
