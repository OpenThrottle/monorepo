import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import type { HeroProps } from '../Hero';
import { Hero } from '../Hero';

describe('Hero Component', () => {
  let component: RenderResult;
  let props: HeroProps;

  beforeEach(() => {
    props = {
      className: 'my-20',
      heading: 'A custom CMS',
      highlight: 'using your code',
      subheading: 'Build, ship, and iterate.',
    };

    const Component = (): React.ReactElement => {
      return <Hero {...props} />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders the heading and highlight as the h1', async () => {
    const heading = await component.findByRole('heading', { level: 1 });

    expect(heading).toHaveTextContent('A custom CMS');
    expect(heading).toHaveTextContent('using your code');
  });

  test('renders the subheading as an h2', async () => {
    expect(
      await component.findByRole('heading', { level: 2 }),
    ).toHaveTextContent('Build, ship, and iterate.');
  });

  test('applies the caller className to the wrapper', async () => {
    const heading = await component.findByRole('heading', { level: 1 });

    expect(heading.parentElement).toHaveClass('my-20');
  });
});
