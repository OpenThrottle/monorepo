import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { MOCK_FRAGMENTS } from '../../data/mock.fragments';
import type { CmsFragment } from '../../types/cms-fragment';
import { CoreFragmentRenderer } from '../CoreFragmentRenderer';

const getFragmentHref = (fragment: CmsFragment): string => {
  return `/edit/${fragment.uuid}`;
};

describe('CoreFragmentRenderer', () => {
  test('links each leaf to the href the caller builds', () => {
    const Component = () => {
      return (
        <CoreFragmentRenderer
          className={undefined}
          fragments={MOCK_FRAGMENTS}
          getFragmentHref={getFragmentHref}
        />
      );
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);
    const links = component.getAllByRole('link');

    expect(links.map((link) => link.getAttribute('href'))).toStrictEqual([
      '/edit/heading-1',
      '/edit/heading-2',
      '/edit/unknown-1',
    ]);
    expect(component.queryByRole('link', { name: 'LayoutGrid' })).toBeNull();
  });
});
