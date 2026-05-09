import type {
  ClientErrorKind,
  HttpRouteErrorBucket,
  JavascriptErrorSubtype,
} from './client-error-diagnostics';
import {
  isUsableRollbarClientToken,
  readSafeClientEnvironmentTags,
} from './client-error-diagnostics';

/** Rollbar instance reused for the lifetime of the browser tab. */
let rollbarSingleton: InstanceType<
  (typeof import('rollbar'))['default']
> | null = null;

/**
 * @description Reports a caught {@link Error} to Rollbar when a usable client token exists on `window.env`.
 * Route (HTTP) errors are not reported here to avoid noise.
 */
export const reportJavaScriptErrorToRollbar = async (
  error: Error,
  incidentReferenceId: string,
  kind: ClientErrorKind,
  javascriptSubtype: JavascriptErrorSubtype | undefined,
  classificationSummary: string,
): Promise<void> => {
  if (typeof window === 'undefined') {
    return;
  }

  const token = window.env?.ROLLBAR_TOKEN;
  if (!isUsableRollbarClientToken(token)) {
    return;
  }

  try {
    const Rollbar = (await import('rollbar')).default;
    const envTags = readSafeClientEnvironmentTags();

    if (rollbarSingleton == null) {
      rollbarSingleton = new Rollbar({
        accessToken: token,
        captureUncaught: false,
        captureUnhandledRejections: false,
        payload: {
          client: {
            javascript: {
              code_version: window.env?.APP_VERSION ?? undefined,
            },
          },
        },
      });
    }

    rollbarSingleton.error(error.message, error, {
      custom: {
        ...envTags,
        classificationSummary,
        incidentReferenceId,
        kind,
        ...(javascriptSubtype != null ? { javascriptSubtype } : {}),
      },
    });
  } catch (reportError) {
    console.warn('Rollbar report failed', reportError);
  }
};

const summarizeRouteErrorData = (data: unknown): string => {
  if (typeof data === 'string') {
    return data.length > 2000 ? `${data.slice(0, 2000)}…` : data;
  }
  try {
    const s = JSON.stringify(data);
    return s.length > 2000 ? `${s.slice(0, 2000)}…` : s;
  } catch {
    return '[unserializable route error data]';
  }
};

/**
 * @description Reports loader/action HTTP 5xx route responses to Rollbar when a usable client token exists.
 * Omits 4xx to limit noise from expected client failures.
 */
export const reportRouteHttpErrorToRollbar = async (params: {
  readonly classificationSummary: string;
  readonly data: unknown;
  readonly httpBucket: HttpRouteErrorBucket;
  readonly incidentReferenceId: string;
  readonly status: number;
  readonly statusText: string;
}): Promise<void> => {
  if (typeof window === 'undefined') {
    return;
  }
  if (params.status < 500) {
    return;
  }

  const token = window.env?.ROLLBAR_TOKEN;
  if (!isUsableRollbarClientToken(token)) {
    return;
  }

  try {
    const Rollbar = (await import('rollbar')).default;
    const envTags = readSafeClientEnvironmentTags();

    if (rollbarSingleton == null) {
      rollbarSingleton = new Rollbar({
        accessToken: token,
        captureUncaught: false,
        captureUnhandledRejections: false,
        payload: {
          client: {
            javascript: {
              code_version: window.env?.APP_VERSION ?? undefined,
            },
          },
        },
      });
    }

    const routeErr = new Error(
      `HTTP ${params.status} ${params.statusText}`.trim(),
    );

    rollbarSingleton.error(routeErr.message, routeErr, {
      custom: {
        ...envTags,
        classificationSummary: params.classificationSummary,
        dataPreview: summarizeRouteErrorData(params.data),
        httpBucket: params.httpBucket,
        incidentReferenceId: params.incidentReferenceId,
        kind: 'http',
        status: params.status,
        statusText: params.statusText,
      },
    });
  } catch (reportError) {
    console.warn('Rollbar route report failed', reportError);
  }
};
