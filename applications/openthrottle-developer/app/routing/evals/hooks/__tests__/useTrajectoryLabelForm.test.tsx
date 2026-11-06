import { act, renderHook } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import type { UseTrajectoryLabelFormOptions } from '../useTrajectoryLabelForm';
import { useTrajectoryLabelForm } from '../useTrajectoryLabelForm';

const renderLabelHook = (options: UseTrajectoryLabelFormOptions) => {
  return renderHook(
    () => {
      return useTrajectoryLabelForm(options);
    },
    {
      wrapper: ({ children }) => {
        const Stub = createRoutesStub([
          {
            Component: () => {
              return <>{children}</>;
            },
            path: '/',
          },
        ]);

        return <Stub />;
      },
    },
  );
};

describe('useTrajectoryLabelForm', () => {
  test('seeds the verdict from your stored label', () => {
    const { result } = renderLabelHook({ initialVerdict: 'fail' });

    expect(result.current.verdict).toBe('fail');
    expect(result.current.isSaving).toBe(false);
    expect(result.current.error).toBeUndefined();
  });

  test('ignores an unknown stored verdict', () => {
    const { result } = renderLabelHook({ initialVerdict: 'error' });

    expect(result.current.verdict).toBeNull();
  });

  test('keeps the choice when Radix reports a deselect', () => {
    const { result } = renderLabelHook({ initialVerdict: null });

    act(() => {
      result.current.onVerdictChange('pass');
    });
    act(() => {
      result.current.onVerdictChange('');
    });

    expect(result.current.verdict).toBe('pass');
  });
});
