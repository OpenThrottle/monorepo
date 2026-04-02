import * as React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { WorkflowRunOptions } from '../WorkflowRunOptions';
import type { WorkflowRunOptionsProps } from '../WorkflowRunOptions';

describe('WorkflowRunOptions Component', () => {
  /** Value passed to `document.execCommand('copy')` via OpenThrottleClipboard fallback (jsdom has no Clipboard API by default). */
  let lastCopiedViaExecCommand: string;

  beforeEach(() => {
    lastCopiedViaExecCommand = '';
    /** Prefer execCommand fallback so we can assert copied text without async Clipboard mocks. */
    vi.stubGlobal('navigator', {
      ...globalThis.navigator,
      clipboard: undefined,
    });
    // @ts-expect-error jsdom does not implement execCommand; library fallback depends on it
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
    const props: WorkflowRunOptionsProps = {};
    const Component = () => <WorkflowRunOptions {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    const component = render(<RoutesStub />);

    expect(component.getByTestId('WorkflowRunOptions')).toBeInTheDocument();
    expect(
      component.getByRole('heading', {
        level: 2,
        name: 'Workflow run options',
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
    const props: WorkflowRunOptionsProps = {
      planId: '0c2720a9-920f-4b16-865a-f803eb444e18',
    };
    const Component = () => <WorkflowRunOptions {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByTestId } = render(<RoutesStub />);

    expect(getByTestId('workflow-run-plan-id-input')).toHaveValue(
      '0c2720a9-920f-4b16-865a-f803eb444e18',
    );
  });

  test('should copy canonical CLI including --plan when copy is activated', () => {
    const props: WorkflowRunOptionsProps = {
      planId: '0c2720a9-920f-4b16-865a-f803eb444e18',
    };
    const Component = () => <WorkflowRunOptions {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByRole } = render(<RoutesStub />);

    fireEvent.click(getByRole('button', { name: 'Copy canonical command' }));

    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(lastCopiedViaExecCommand).toBe(
      'pnpm exec workflow-ralph --plan 0c2720a9-920f-4b16-865a-f803eb444e18',
    );
  });

  describe('accessibility of primary controls', () => {
    test('exposes labeled inputs for plan target and prompt profile', () => {
      const props: WorkflowRunOptionsProps = {
        planId: '0c2720a9-920f-4b16-865a-f803eb444e18',
      };
      const Component = () => <WorkflowRunOptions {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      const { getByLabelText } = render(<RoutesStub />);

      expect(
        getByLabelText('Cortex plan UUID for --plan'),
      ).toBeInTheDocument();
      expect(getByLabelText('Prompt profile for --prompt')).toBeInTheDocument();
      expect(
        getByLabelText('Cortex run target: plan or task'),
      ).toBeInTheDocument();
    });

    test('titles the card section for screen readers via heading', () => {
      const Component = () => <WorkflowRunOptions />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      const { getByRole } = render(<RoutesStub />);

      expect(
        getByRole('heading', { level: 2, name: 'Workflow run options' }),
      ).toHaveAttribute('id', 'workflow-run-options-title');
    });
  });
});
