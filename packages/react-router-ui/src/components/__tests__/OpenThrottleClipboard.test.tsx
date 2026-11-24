import type { RenderResult } from '@testing-library/react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { OpenThrottleClipboardProps } from '../OpenThrottleClipboard';
import { OpenThrottleClipboard } from '../OpenThrottleClipboard';

describe('OpenThrottleClipboard Component', () => {
  let component: RenderResult;
  let props: OpenThrottleClipboardProps;

  beforeEach(() => {
    props = { text: '' };

    const Component = () => {
      return <OpenThrottleClipboard {...props} />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders copy button with default label', () => {
    expect(
      component.getByRole('button', { name: 'Copy to clipboard' }),
    ).toBeInTheDocument();
  });

  describe('when navigator.clipboard is available', () => {
    test('shows Copied! after a successful write', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText },
      });

      await userEvent.click(
        component.getByRole('button', { name: 'Copy to clipboard' }),
      );

      await waitFor(() => {
        expect(
          component.getByRole('button', { name: 'Copied' }),
        ).toBeInTheDocument();
      });
    });

    test('falls back to the idle label when the write rejects', async () => {
      const writeText = vi.fn().mockRejectedValue(new Error('denied'));
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText },
      });

      await userEvent.click(
        component.getByRole('button', { name: 'Copy to clipboard' }),
      );

      await waitFor(() => {
        expect(writeText).toHaveBeenCalledTimes(1);
      });
      await waitFor(() => {
        expect(
          component.getByRole('button', { name: 'Copy to clipboard' }),
        ).toBeInTheDocument();
      });
    });
  });
});
