import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { PREVIEW_COPY } from '../../data/data.copy';
import { CORE_COMPONENTS } from '../../data/data.registry';
import { MOCK_FRAGMENTS } from '../../data/mock.fragments';
import type { CmsFragment } from '../../types/cms-fragment';
import { CoreRendererDebug } from '../CoreRendererDebug';

const getFragmentHref = (fragment: CmsFragment): string => {
  return `/edit/${fragment.uuid}`;
};

const renderDebug = (debug: boolean) => {
  const Component = () => {
    return (
      <CoreRendererDebug
        className={undefined}
        componentRegistry={CORE_COMPONENTS}
        debug={debug}
        fragments={MOCK_FRAGMENTS}
        getFragmentHref={getFragmentHref}
        selectedUuid="heading-1"
      />
    );
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('CoreRendererDebug', () => {
  describe('in debug mode', () => {
    test('links every fragment to its editor, deeper ones stacked higher', () => {
      const component = renderDebug(true);
      const grid = component.getByRole('link', {
        name: `${PREVIEW_COPY.editFragment} LayoutGrid`,
      });
      const [heading] = component.getAllByRole('link', {
        name: `${PREVIEW_COPY.editFragment} Heading`,
      });

      expect(grid).toHaveAttribute('href', '/edit/grid-1');
      expect(heading).toHaveAttribute('href', '/edit/heading-1');
      expect(Number(heading?.style.zIndex)).toBeGreaterThan(
        Number(grid.style.zIndex),
      );
    });

    test('outlines the selected fragment only', () => {
      const component = renderDebug(true);
      const heading = component.getByRole('heading', { name: 'Hello world' });

      expect(heading.closest('[data-selected="true"]')).not.toBeNull();
      expect(
        component.container.querySelectorAll('[data-selected="true"]'),
      ).toHaveLength(1);
    });
  });

  describe('outside debug mode', () => {
    test('renders the page with no editing layer', () => {
      const component = renderDebug(false);

      expect(
        component.getByRole('heading', { name: 'Hello world' }),
      ).toBeInTheDocument();
      expect(component.queryAllByRole('link')).toHaveLength(0);
      expect(
        component.container.querySelectorAll('[data-selected="true"]'),
      ).toHaveLength(0);
    });
  });
});
