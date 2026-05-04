import type {
  ClientErrorKind,
  JavascriptErrorSubtype,
} from './client-error-diagnostics';
import { isUsableRollbarClientToken } from './client-error-diagnostics';

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
  javascriptSubtype?: JavascriptErrorSubtype,
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
        incidentReferenceId,
        kind,
        ...(javascriptSubtype != null ? { javascriptSubtype } : {}),
      },
    });
  } catch (reportError) {
    console.warn('Rollbar report failed', reportError);
  }
};
