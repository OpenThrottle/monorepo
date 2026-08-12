import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  reportJavaScriptErrorToRollbar,
  reportRouteHttpErrorToRollbar,
} from '../client-error-rollbar';

interface RollbarErrorCustomContext {
  readonly custom: Record<string, unknown>;
}

const rollbarErrorMock =
  vi.fn<
    (message: string, error: Error, context: RollbarErrorCustomContext) => void
  >();
const rollbarConstructorMock = vi.fn();

vi.mock('rollbar', () => {
  return {
    default: class RollbarMock {
      public error = rollbarErrorMock;

      public constructor(options: unknown) {
        rollbarConstructorMock(options);
      }
    },
  };
});

const USABLE_TOKEN = 'a-real-post-client-item-token';

describe('reportJavaScriptErrorToRollbar', () => {
  beforeEach(() => {
    rollbarErrorMock.mockClear();
    rollbarConstructorMock.mockClear();
    window.env = { ...window.env, ROLLBAR_TOKEN: '' };
  });

  test('does nothing when no usable Rollbar token is configured', async () => {
    await reportJavaScriptErrorToRollbar(
      new Error('boom'),
      'incident-1',
      'javascript',
      'generic',
      'summary',
    );

    expect(rollbarConstructorMock).not.toHaveBeenCalled();
    expect(rollbarErrorMock).not.toHaveBeenCalled();
  });

  test('reports the error with custom tags when a usable token is configured', async () => {
    window.env = { ...window.env, ROLLBAR_TOKEN: USABLE_TOKEN };
    const error = new Error('boom');

    await reportJavaScriptErrorToRollbar(
      error,
      'incident-1',
      'javascript',
      'generic',
      'JavaScript · generic application error',
    );

    expect(rollbarConstructorMock).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: USABLE_TOKEN }),
    );
    expect(rollbarErrorMock).toHaveBeenCalledWith(
      'boom',
      error,
      expect.objectContaining({
        custom: expect.objectContaining({
          classificationSummary: 'JavaScript · generic application error',
          incidentReferenceId: 'incident-1',
          javascriptSubtype: 'generic',
          kind: 'javascript',
        }),
      }),
    );
  });

  test('omits javascriptSubtype from custom tags when not provided', async () => {
    window.env = { ...window.env, ROLLBAR_TOKEN: USABLE_TOKEN };

    await reportJavaScriptErrorToRollbar(
      new Error('boom'),
      'incident-2',
      'javascript',
      undefined,
      'summary',
    );

    const lastCall = rollbarErrorMock.mock.calls.at(-1);
    if (lastCall === undefined) {
      throw new Error('expected rollbarErrorMock to have been called');
    }
    const [, , context] = lastCall;
    expect(context.custom).not.toHaveProperty('javascriptSubtype');
  });
});

describe('reportRouteHttpErrorToRollbar', () => {
  beforeEach(() => {
    rollbarErrorMock.mockClear();
    rollbarConstructorMock.mockClear();
    window.env = { ...window.env, ROLLBAR_TOKEN: '' };
  });

  test('does nothing for a 4xx status even with a usable token', async () => {
    window.env = { ...window.env, ROLLBAR_TOKEN: USABLE_TOKEN };

    await reportRouteHttpErrorToRollbar({
      classificationSummary: 'HTTP 404 Not Found (client)',
      data: 'missing',
      httpBucket: 'client',
      incidentReferenceId: 'incident-3',
      status: 404,
      statusText: 'Not Found',
    });

    expect(rollbarErrorMock).not.toHaveBeenCalled();
  });

  test('does nothing for a 5xx status when no usable token is configured', async () => {
    await reportRouteHttpErrorToRollbar({
      classificationSummary: 'HTTP 500 Internal Server Error (server)',
      data: 'oops',
      httpBucket: 'server',
      incidentReferenceId: 'incident-4',
      status: 500,
      statusText: 'Internal Server Error',
    });

    expect(rollbarErrorMock).not.toHaveBeenCalled();
  });

  test('reports a 5xx route error with a JSON-preview payload when a usable token is configured', async () => {
    window.env = { ...window.env, ROLLBAR_TOKEN: USABLE_TOKEN };

    await reportRouteHttpErrorToRollbar({
      classificationSummary: 'HTTP 503 Service Unavailable (server)',
      data: { reason: 'db down' },
      httpBucket: 'server',
      incidentReferenceId: 'incident-5',
      status: 503,
      statusText: 'Service Unavailable',
    });

    expect(rollbarErrorMock).toHaveBeenCalledWith(
      'HTTP 503 Service Unavailable',
      expect.any(Error),
      expect.objectContaining({
        custom: expect.objectContaining({
          dataPreview: JSON.stringify({ reason: 'db down' }),
          httpBucket: 'server',
          incidentReferenceId: 'incident-5',
          kind: 'http',
          status: 503,
          statusText: 'Service Unavailable',
        }),
      }),
    );
  });
});
