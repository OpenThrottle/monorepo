import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { GeneratorCard } from '../GeneratorCard';
import type { GeneratorCardProps } from '../GeneratorCard';

describe('GeneratorCard Component', () => {
  let component: RenderResult;
  let props: GeneratorCardProps;

  beforeEach(() => {
    props = {
      generator: {
        description: 'Test Description',
        name: 'Test Generator',
      },
    };

    const Component = () => <GeneratorCard {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render name, description, and link to generator detail', () => {
    expect(component.getByTestId('GeneratorCard')).toBeInTheDocument();
    expect(
      component.getByRole('heading', { level: 2, name: 'Test Generator' }),
    ).toBeInTheDocument();
    expect(component.getByText('Test Description')).toBeInTheDocument();
    const viewLink = component.getByRole('link', { name: 'View' });
    expect(viewLink).toHaveAttribute('href', '/generators/Test Generator');
  });
});
