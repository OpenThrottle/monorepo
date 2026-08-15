import * as React from 'react';
import { toast } from '@openthrottle/react-router-shadcn';
import { getActionError } from '@openthrottle/react-router-utils';

/**
 * Resolves a toast message from an action result: either a static string or a
 * function deriving the message from the result (returning a falsy value to
 * suppress the toast).
 */
type ToastMessage<TResult> =
  string | ((result: TResult) => string | null | undefined);

export interface UseActionToastOptions<TResult> {
  /**
   * True while the submission is in flight — `fetcher.state !== 'idle'` for a
   * useFetcher mutation, or `navigation.state !== 'idle'` for a `<Form>`.
   * The toast fires once on the transition from active to idle.
   */
  readonly active: boolean;
  /**
   * Overrides error-message extraction. By default a string `error` field on
   * the result is surfaced as `toast.error`.
   */
  readonly error?: ToastMessage<TResult>;
  /**
   * Stable id so rapid re-submits replace the prior toast rather than stacking.
   * Defaults to no id (each completion shows its own toast).
   */
  readonly id?: string;
  /** Invoked once on the error edge. */
  readonly onError?: (result: TResult) => void;
  /** Invoked once on the success edge (e.g. to close a dialog or revalidate). */
  readonly onSuccess?: (result: TResult) => void;
  /**
   * Success message shown when the completed result carries no error. Omit to
   * stay silent on success (e.g. when a redirect is the success signal).
   */
  readonly success?: ToastMessage<TResult>;
}

const resolveMessage = <TResult>(
  message: ToastMessage<TResult> | undefined,
  result: TResult,
): string | null => {
  if (message == null) {
    return null;
  }
  const value = typeof message === 'function' ? message(result) : message;
  return typeof value === 'string' && value.length > 0 ? value : null;
};

/**
 * @public
 * @description Fires a single success or error Sonner toast on the transition
 * from in-flight to idle for a React Router `useFetcher` or `<Form>`
 * submission. Encapsulates the busy-edge detection so callers don't repeat the
 * ref + effect boilerplate. Error precedence: an explicit `error` option, else
 * a string `error` field on the result; if neither is present the `success`
 * message (when provided) fires. Pass a stable `id` to dedupe rapid re-submits.
 */
export const useActionToast = <TResult>(
  result: TResult,
  options: UseActionToastOptions<TResult>,
): void => {
  const { active, error, id, onError, onSuccess, success } = options;
  const wasActiveRef = React.useRef(false);

  React.useEffect(() => {
    const justCompleted = wasActiveRef.current && !active;
    wasActiveRef.current = active;

    if (!justCompleted) {
      return;
    }

    const errorMessage =
      resolveMessage(error, result) ?? getActionError(result);
    if (errorMessage != null) {
      toast.error(errorMessage, id != null ? { id } : undefined);
      onError?.(result);
      return;
    }

    // Only signal success when the action actually returned a result; a bare
    // navigation with no action data (e.g. a redirect) leaves `result` nullish.
    if (result == null) {
      return;
    }

    const successMessage = resolveMessage(success, result);
    if (successMessage != null) {
      toast.success(successMessage, id != null ? { id } : undefined);
      onSuccess?.(result);
    }
  }, [active, error, id, onError, onSuccess, result, success]);
};
