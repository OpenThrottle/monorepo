import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { toast } from '@openthrottle/react-router-shadcn';
import { useActionToast } from '~/global/hooks/useActionToast';

vi.mock('@openthrottle/react-router-shadcn', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const successMock = vi.mocked(toast.success);
const errorMock = vi.mocked(toast.error);

interface HarnessProps {
  readonly active: boolean;
  readonly result: unknown;
}

const renderActionToast = (initialProps: HarnessProps) =>
  renderHook(
    (props: HarnessProps) =>
      useActionToast(props.result, {
        active: props.active,
        error: (r) =>
          r != null && typeof r === 'object' && 'boom' in r
            ? String(r.boom)
            : undefined,
        id: 'test-toast',
        success: 'Saved.',
      }),
    { initialProps },
  );

describe('useActionToast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('fires a success toast on the in-flight -> idle edge with a result', () => {
    const { rerender } = renderActionToast({
      active: false,
      result: undefined,
    });

    rerender({ active: true, result: undefined });
    rerender({ active: false, result: { ok: true } });

    expect(successMock).toHaveBeenCalledWith('Saved.', { id: 'test-toast' });
    expect(errorMock).not.toHaveBeenCalled();
  });

  test('stays silent when the completed result is nullish (e.g. a redirect)', () => {
    const { rerender } = renderActionToast({
      active: false,
      result: undefined,
    });

    rerender({ active: true, result: undefined });
    rerender({ active: false, result: undefined });

    expect(successMock).not.toHaveBeenCalled();
    expect(errorMock).not.toHaveBeenCalled();
  });

  test('surfaces a string `error` field as an error toast, suppressing success', () => {
    const initialProps: HarnessProps = { active: false, result: undefined };
    const { rerender } = renderHook(
      (props: HarnessProps) =>
        useActionToast(props.result, {
          active: props.active,
          id: 'test-toast',
          success: 'Saved.',
        }),
      { initialProps },
    );

    rerender({ active: true, result: undefined });
    rerender({
      active: false,
      result: { error: 'Boom.' },
    });

    expect(errorMock).toHaveBeenCalledWith('Boom.', { id: 'test-toast' });
    expect(successMock).not.toHaveBeenCalled();
  });

  test('uses a custom error extractor over the default field', () => {
    const { rerender } = renderActionToast({
      active: false,
      result: undefined,
    });

    rerender({ active: true, result: undefined });
    rerender({ active: false, result: { boom: 'Custom failure.' } });

    expect(errorMock).toHaveBeenCalledWith('Custom failure.', {
      id: 'test-toast',
    });
    expect(successMock).not.toHaveBeenCalled();
  });

  test('does not fire without a completion edge', () => {
    const { rerender } = renderActionToast({
      active: false,
      result: undefined,
    });

    rerender({ active: false, result: { ok: true } });

    expect(successMock).not.toHaveBeenCalled();
    expect(errorMock).not.toHaveBeenCalled();
  });
});
