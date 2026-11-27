import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { CHAT_LOAD_EARLIER_COPY } from '../../data/copy';
import { ChatLoadEarlier } from '../ChatLoadEarlier';

describe('ChatLoadEarlier', () => {
  describe('when idle', () => {
    it('calls onLoadEarlier when clicked', async () => {
      const onLoadEarlier = vi.fn();
      const component = render(
        <ChatLoadEarlier isLoading={false} onLoadEarlier={onLoadEarlier} />,
      );

      await userEvent.click(
        component.getByRole('button', { name: CHAT_LOAD_EARLIER_COPY.label }),
      );

      expect(onLoadEarlier).toHaveBeenCalledTimes(1);
    });
  });

  describe('when loading', () => {
    it('disables the control', () => {
      const component = render(
        <ChatLoadEarlier isLoading={true} onLoadEarlier={vi.fn()} />,
      );

      const button = component.getByRole('button', {
        name: CHAT_LOAD_EARLIER_COPY.loading,
      });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-busy', 'true');
    });
  });
});
