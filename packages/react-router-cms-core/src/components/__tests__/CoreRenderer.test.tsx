import { Button } from '@openthrottle/react-router-cms-ui';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { CORE_COMPONENTS } from '../../data/data.registry';
import { MOCK_FRAGMENTS } from '../../data/mock.fragments';
import type { CmsComponentRegistry } from '../../types/cms-render';
import { createComponentRegistry } from '../../utils/component-registry';
import { registerComponent } from '../../utils/register-component';
import { toButtonProps } from '../../utils/registry-props';
import { CoreRenderer } from '../CoreRenderer';

const renderAt = (url: string, componentRegistry: CmsComponentRegistry) => {
  const Component = () => {
    return (
      <CoreRenderer
        className={undefined}
        componentRegistry={componentRegistry}
        fragments={MOCK_FRAGMENTS}
      />
    );
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub initialEntries={[url]} />);
};

describe('CoreRenderer', () => {
  describe('with the core registry', () => {
    test('renders known blocks with their stored properties', () => {
      const component = renderAt('/', CORE_COMPONENTS);

      expect(
        component.getByRole('heading', { level: 1, name: 'Hello world' }),
      ).toBeInTheDocument();
      expect(component.getByTestId('LayoutGrid')).toHaveClass('grid-cols-2');
    });

    test('renders nested children through their parent', () => {
      const component = renderAt('/?variant=b', CORE_COMPONENTS);

      expect(
        component.getByRole('heading', { level: 3, name: 'Variant B' }),
      ).toBeInTheDocument();
    });

    test('renders nothing for an unknown typename', () => {
      const component = renderAt('/', CORE_COMPONENTS);

      expect(component.queryByText('NotARealBlock')).toBeNull();
      expect(component.queryByRole('heading', { level: 3 })).toBeNull();
    });
  });

  describe('with an injected registry', () => {
    test('uses the injected component over the core one', () => {
      const component = renderAt(
        '/',
        createComponentRegistry({
          Heading: registerComponent(Button, toButtonProps),
        }),
      );

      expect(component.getAllByRole('button')).toHaveLength(1);
      expect(component.queryByRole('heading', { level: 1 })).toBeNull();
    });
  });
});
