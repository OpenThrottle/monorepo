import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import * as ReactRouter from 'react-router';
import { createRoutesStub } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { MockedFunction } from 'vitest';
import { toast } from '@openthrottle/react-router-shadcn';
import * as clientErrorRollbar from '../../utils/client-error-rollbar';
import { useGlobalErrorBoundary } from '../useGlobalErrorBoundary';
import type { UseGlobalErrorBoundaryResult } from '../useGlobalErrorBoundary';

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return {
    ...actual,
    useRouteError: vi.fn(),
  };
});

vi.mock('@openthrottle/react-router-shadcn', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-shadcn')>();
  return {
    ...actual,
    toast: { success: vi.fn() },
  };
});

function Harness(): React.ReactElement {
  const result = useGlobalErrorBoundary();
  latestResult = result;

  return (
    <div>
      <span data-testid="kind">{result.kind}</span>
      <span data-testid="classification">{result.classificationSummary}</span>
      <span data-testid="reference-id">{result.incidentReferenceId}</span>
      <button onClick={result.onClickRefresh} type="button">
        refresh
      </button>
      <button
        onClick={() => {
          void result.onCopyReferenceId();
        }}
        type="button"
      >
        copy-reference
      </button>
      <button
        onClick={() => {
          void result.onCopyIncidentDetails();
        }}
        type="button"
      >
        copy-details
      </button>
    </div>
  );
}

let latestResult: UseGlobalErrorBoundaryResult | undefined;

describe('useGlobalErrorBoundary', () => {
  let useRouteErrorMock: MockedFunction<typeof ReactRouter.useRouteError>;
  let reportJsSpy: ReturnType<typeof vi.spyOn>;
  let reportHttpSpy: ReturnType<typeof vi.spyOn>;
  let clipboardWriteText: ReturnType<typeof vi.fn>;

  afterEach(() => {
    cleanup();
    reportJsSpy.mockRestore();
    reportHttpSpy.mockRestore();
  });

  beforeEach(() => {
    latestResult = undefined;
    useRouteErrorMock = vi.mocked(ReactRouter.useRouteError);
    useRouteErrorMock.mockReset();
    vi.mocked(toast.success).mockReset();

    reportJsSpy = vi
      .spyOn(clientErrorRollbar, 'reportJavaScriptErrorToRollbar')
      .mockResolvedValue(undefined);
    reportHttpSpy = vi
      .spyOn(clientErrorRollbar, 'reportRouteHttpErrorToRollbar')
      .mockResolvedValue(undefined);

    clipboardWriteText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: clipboardWriteText },
    });
  });

  test('classifies a JavaScript error and reports it to Rollbar exactly once', () => {
    const error = new Error('boom');
    useRouteErrorMock.mockReturnValue(error);

    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => <Harness />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { rerender } = render(<RoutesStub />);

    expect(latestResult?.kind).toBe('javascript');
    expect(reportJsSpy).toHaveBeenCalledTimes(1);

    rerender(<RoutesStub />);
    expect(reportJsSpy).toHaveBeenCalledTimes(1);
  });

  test('classifies a 5xx route error response and reports it to Rollbar', () => {
    const routeError = {
      data: 'server exploded',
      internal: false,
      status: 503,
      statusText: 'Service Unavailable',
    };
    useRouteErrorMock.mockReturnValue(routeError);

    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => <Harness />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(latestResult?.kind).toBe('http');
    expect(reportHttpSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 503,
        statusText: 'Service Unavailable',
      }),
    );
  });

  test('does not report a 4xx route error to Rollbar', () => {
    const routeError = {
      data: 'not found',
      internal: false,
      status: 404,
      statusText: 'Not Found',
    };
    useRouteErrorMock.mockReturnValue(routeError);

    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => <Harness />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(reportHttpSpy).not.toHaveBeenCalled();
  });

  test('classifies an unrecognized thrown value as unknown', () => {
    useRouteErrorMock.mockReturnValue('unexpected');

    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => <Harness />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(latestResult?.kind).toBe('unknown');
    expect(reportJsSpy).not.toHaveBeenCalled();
    expect(reportHttpSpy).not.toHaveBeenCalled();
  });

  test('onClickRefresh reloads the page', () => {
    useRouteErrorMock.mockReturnValue(new Error('boom'));
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadMock },
    });

    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => <Harness />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByRole } = render(<RoutesStub />);

    getByRole('button', { name: 'refresh' }).click();
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  test('onCopyReferenceId copies the incident id and shows a success toast', async () => {
    useRouteErrorMock.mockReturnValue(new Error('boom'));

    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => <Harness />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByRole, getByTestId } = render(<RoutesStub />);

    const referenceId = getByTestId('reference-id').textContent ?? '';
    getByRole('button', { name: 'copy-reference' }).click();

    await vi.waitFor(() => {
      expect(clipboardWriteText).toHaveBeenCalledWith(referenceId);
    });
    expect(toast.success).toHaveBeenCalledWith(
      'Reference id copied to clipboard',
    );
  });

  test('onCopyIncidentDetails copies a JSON payload and shows a success toast', async () => {
    const error = new Error('boom');
    useRouteErrorMock.mockReturnValue(error);

    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => <Harness />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByRole } = render(<RoutesStub />);

    getByRole('button', { name: 'copy-details' }).click();

    await vi.waitFor(() => {
      expect(clipboardWriteText).toHaveBeenCalled();
    });
    const payload = JSON.parse(clipboardWriteText.mock.calls[0][0]);
    expect(payload.errorKind).toBe('javascript');
    expect(payload.message).toBe('boom');
    expect(toast.success).toHaveBeenCalledWith(
      'Incident details copied to clipboard',
    );
  });
});
