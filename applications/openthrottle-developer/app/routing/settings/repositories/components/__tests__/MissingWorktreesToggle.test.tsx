import type { RenderResult } from '@testing-library/react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub, useLocation } from 'react-router';
import { describe, expect, test } from 'vitest';

import type { MissingWorktreesToggleProps } from '../MissingWorktreesToggle';
import { MissingWorktreesToggle } from '../MissingWorktreesToggle';

/** Renders the toggle beside a probe that exposes the current query string. */
const renderToggle = (
  props: MissingWorktreesToggleProps,
  initialEntry = '/?page=3',
): RenderResult => {
  const Component = () => {
    const location = useLocation();

    return (
      <>
        <MissingWorktreesToggle {...props} />
        <output data-testid="search">{location.search}</output>
      </>
    );
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub initialEntries={[initialEntry]} />);
};

describe('MissingWorktreesToggle Component', () => {
  describe('when worktrees are missing and hidden', () => {
    test('renders an unchecked switch labelled with the count', () => {
      const component = renderToggle({ count: 3, showMissing: false });

      const toggle = component.getByRole('switch', { name: /3/ });
      expect(toggle).toHaveAttribute('aria-checked', 'false');
    });

    test('turning it on sets showMissing and resets paging', async () => {
      const user = userEvent.setup();
      const component = renderToggle({ count: 3, showMissing: false });

      await user.click(component.getByRole('switch'));

      await waitFor(() =>
        expect(component.getByTestId('search')).toHaveTextContent(
          '?showMissing=1',
        ),
      );
    });
  });

  describe('when they are shown', () => {
    test('turning it off removes the param', async () => {
      const user = userEvent.setup();
      const component = renderToggle(
        { count: 3, showMissing: true },
        '/?showMissing=1',
      );

      await user.click(component.getByRole('switch'));

      await waitFor(() =>
        expect(component.getByTestId('search')).toBeEmptyDOMElement(),
      );
    });

    test('stays visible with nothing left to show, so it can be switched off', () => {
      const component = renderToggle(
        { count: 0, showMissing: true },
        '/?showMissing=1',
      );

      expect(component.getByRole('switch')).toBeInTheDocument();
    });
  });

  describe('when nothing is missing', () => {
    test('renders nothing', () => {
      const component = renderToggle({ count: 0, showMissing: false });

      expect(component.queryByRole('switch')).not.toBeInTheDocument();
    });
  });
});
