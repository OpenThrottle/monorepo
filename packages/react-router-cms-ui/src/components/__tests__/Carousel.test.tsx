import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import { COPY } from '../../data/data.copy';
import type { CarouselProps } from '../Carousel';
import { Carousel } from '../Carousel';

describe('Carousel Component', () => {
  let component: RenderResult;
  let props: CarouselProps;

  beforeEach(() => {
    props = {
      className: 'max-w-3xl',
      images: [
        'https://picsum.photos/id/300/800/200',
        'https://picsum.photos/id/301/800/200',
        'https://picsum.photos/id/300/800/200',
      ],
    };

    const Component = (): React.ReactElement => {
      return <Carousel {...props} />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders a labelled carousel with the caller className', async () => {
    const region = await component.findByRole('region', {
      name: COPY.carousel.label,
    });

    expect(region).toHaveClass('max-w-3xl');
  });

  test('renders one labelled slide per image, repeats included', async () => {
    const slides = await component.findAllByRole('group');

    expect(slides).toHaveLength(3);
    expect(
      component.getByRole('img', { name: 'Slide 2 of 3' }),
    ).toHaveAttribute('src', 'https://picsum.photos/id/301/800/200');
  });

  // jsdom has no layout, so embla never reports a scrollable track and the
  // controls stay disabled; scrolling itself is embla's, covered upstream.
  test('renders previous and next controls', async () => {
    expect(
      await component.findByRole('button', { name: 'Next slide' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'Previous slide' }),
    ).toBeInTheDocument();
  });
});
