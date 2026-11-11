import { renderHook } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { CMS_STATUS } from '../../config/cms-status';
import { CoreFormContext } from '../../data/data.core-form-context';
import type { CmsFormContextValue } from '../../types/cms-render';
import { useCoreFormContext } from '../useCoreFormContext';

const value: CmsFormContextValue = {
  fragmentUuid: 'fragment-1',
  schema: {
    created_at: '2026-01-01T00:00:00.000Z',
    is_deleted: false,
    json_schema: { type: 'object' },
    status: CMS_STATUS.ACTIVE,
    typename: 'Hero',
    updated_at: '2026-01-01T00:00:00.000Z',
    uuid: 'schema-1',
    version: '1.0.0',
  },
};

describe('useCoreFormContext', () => {
  describe('outside a form', () => {
    test('returns no context', () => {
      const { result } = renderHook(() => useCoreFormContext());

      expect(result.current.context).toBeUndefined();
    });
  });

  describe('inside a form', () => {
    test('returns the provided context', () => {
      const wrapper = (props: { readonly children: React.ReactNode }) => {
        return (
          <CoreFormContext.Provider value={value}>
            {props.children}
          </CoreFormContext.Provider>
        );
      };
      const { result } = renderHook(() => useCoreFormContext(), { wrapper });

      expect(result.current.context).toBe(value);
    });
  });
});
