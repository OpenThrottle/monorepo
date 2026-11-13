import { render } from '@testing-library/react';
import * as React from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';

import { CmsLayoutPage } from '../CmsLayoutPage';

describe('CmsLayoutPage', () => {
  describe('when given a fragment tree', () => {
    test('mounts the registered block for each typename inside its parent', () => {
      const component = render(
        <MemoryRouter>
          <CmsLayoutPage
            className={undefined}
            fragments={[
              {
                children: [
                  {
                    children: [],
                    properties: { copy: 'Seeded heading', heading: 'h1' },
                    typename: 'Heading',
                    uuid: 'h',
                  },
                ],
                properties: {},
                typename: 'Layout',
                uuid: 'root',
              },
            ]}
          />
        </MemoryRouter>,
      );
      const page = component.getByTestId('CmsLayoutPage');

      expect(page).toContainElement(component.getByTestId('CoreRenderer'));
      expect(component.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });
  });

  describe('when a typename is not registered', () => {
    test('renders no block for it', () => {
      const component = render(
        <MemoryRouter>
          <CmsLayoutPage
            className={undefined}
            fragments={[
              {
                children: [],
                properties: {},
                typename: 'NotARealBlock',
                uuid: 'x',
              },
            ]}
          />
        </MemoryRouter>,
      );

      expect(component.getByTestId('CoreRenderer')).toBeEmptyDOMElement();
    });
  });
});
