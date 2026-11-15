import { render, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { GlobalLayoutHeaderLinks } from '../GlobalLayoutHeaderLinks';

const renderLinks = (): ReturnType<typeof render> => {
  const RoutesStub = createRoutesStub([
    { Component: GlobalLayoutHeaderLinks, path: '/' },
  ]);
  return render(<RoutesStub />);
};

describe('GlobalLayoutHeaderLinks Component', () => {
  test('every inline icon-only link has an accessible name', () => {
    const component = renderLinks();

    const inline = component.getByTestId('GlobalLayoutHeaderLinksInline');

    const links = within(inline).getAllByRole('link');
    expect(links).toHaveLength(3);
    links.forEach((link) => {
      expect(link).toHaveAccessibleName();
    });
    expect(links.map((link) => link.getAttribute('aria-label'))).toEqual([
      'GitHub',
      'Report a bug',
      'Sign out',
    ]);
  });

  test('inline links are hidden below sm and the overflow trigger is hidden from sm', () => {
    const component = renderLinks();

    const inline = component.getByTestId('GlobalLayoutHeaderLinksInline');
    expect(inline).toHaveClass('hidden');
    expect(
      component.getByRole('button', { name: 'More actions' }).closest('div'),
    ).toHaveClass('sm:hidden');
  });

  test('overflow menu exposes the same destinations', async () => {
    const user = userEvent.setup();
    const component = renderLinks();

    await user.click(component.getByRole('button', { name: 'More actions' }));

    expect(
      await component.findByRole('menuitem', { name: 'GitHub' }),
    ).toHaveAttribute('href', expect.stringContaining('/monorepo'));
    expect(
      component.getByRole('menuitem', { name: 'Report a bug' }),
    ).toHaveAttribute('href', expect.stringContaining('/issues/new/choose'));
    expect(
      component.getByRole('menuitem', { name: 'Sign out' }),
    ).toHaveAttribute('href', '/auth/logout');
  });

  test('overflow trigger and inline links grow to 44px on coarse pointers', () => {
    const component = renderLinks();

    expect(component.getByRole('button', { name: 'More actions' })).toHaveClass(
      'size-6',
      'pointer-coarse:size-11',
    );

    const inline = component.getByTestId('GlobalLayoutHeaderLinksInline');
    within(inline)
      .getAllByRole('link')
      .forEach((link) => {
        expect(link).toHaveClass('size-6', 'pointer-coarse:size-11');
      });
  });
});
