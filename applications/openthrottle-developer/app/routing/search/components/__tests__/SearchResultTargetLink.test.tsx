import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { renderRoutesStub } from '~/testing/route-fixtures';

import { SearchResultTargetLink } from '../SearchResultTargetLink';

describe('SearchResultTargetLink', () => {
  describe('with an internal target', () => {
    test('renders an in-app link', () => {
      const component = renderRoutesStub(
        <SearchResultTargetLink
          className="title"
          label="My Plan"
          target={{ href: '/plans/plan-1', kind: 'internal' }}
          testId="link"
        />,
      );
      const link = component.getByTestId('link');

      expect(link).toHaveAttribute('href', '/plans/plan-1');
      expect(link).not.toHaveAttribute('target');
      expect(link).toHaveClass('title');
      expect(link).toHaveTextContent('My Plan');
    });
  });

  describe('with an external target', () => {
    test('opens in a new tab without leaking the opener', () => {
      const component = renderRoutesStub(
        <SearchResultTargetLink
          label="Doc"
          target={{ href: 'https://github.com/a/b', kind: 'external' }}
          testId="link"
        />,
      );
      const link = component.getByTestId('link');

      expect(link).toHaveAttribute('href', 'https://github.com/a/b');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('with no target', () => {
    test('renders plain text', () => {
      const component = renderRoutesStub(
        <SearchResultTargetLink
          label="Orphan"
          target={{ kind: 'none' }}
          testId="link"
        />,
      );
      const text = component.getByTestId('link');

      expect(text.tagName).toBe('SPAN');
      expect(text).not.toHaveAttribute('href');
      expect(text).toHaveTextContent('Orphan');
    });
  });
});
