import { act, render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import type { UseConversationListContextResult } from '../useConversationListContext';
import { useConversationListContext } from '../useConversationListContext';

describe('useConversationListContext', () => {
  describe('without a provider', () => {
    test('falls back to a list of its own and publishes nothing', () => {
      const latest: { current: UseConversationListContextResult | null } = {
        current: null,
      };
      const Harness = (): null => {
        latest.current = useConversationListContext({ enabled: false });
        return null;
      };
      const Stub = createRoutesStub([{ Component: Harness, path: '/' }]);
      render(<Stub />);

      act(() => {
        latest.current?.setActiveConversationId('conv-1');
      });

      expect(latest.current?.list.conversations).toEqual([]);
      expect(latest.current?.activeConversationId).toBeNull();
    });
  });
});
