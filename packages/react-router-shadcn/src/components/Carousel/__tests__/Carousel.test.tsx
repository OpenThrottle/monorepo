import type { RenderResult } from '@testing-library/react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { Carousel } from '../Carousel';
import { CarouselContent } from '../CarouselContent';
import type { CarouselApi } from '../CarouselContext';
import { CarouselItem } from '../CarouselItem';
import { CarouselNext } from '../CarouselNext';
import { CarouselPrevious } from '../CarouselPrevious';

describe('Carousel Component', () => {
  let component: RenderResult;
  let setApi: (api: CarouselApi) => void;

  beforeEach(() => {
    setApi = vi.fn();

    const Component = (): React.ReactElement => {
      return (
        <Carousel aria-label="Gallery" setApi={setApi}>
          <CarouselContent>
            <CarouselItem>One</CarouselItem>
            <CarouselItem>Two</CarouselItem>
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      );
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders a labelled carousel region of slides', async () => {
    const region = await component.findByRole('region', { name: 'Gallery' });

    expect(region).toHaveAttribute('aria-roledescription', 'carousel');
    expect(component.getAllByRole('group')).toHaveLength(2);
  });

  test('renders accessible previous and next controls', async () => {
    expect(
      await component.findByRole('button', { name: 'Previous slide' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'Next slide' }),
    ).toBeInTheDocument();
  });

  test('hands the embla api to setApi once initialised', async () => {
    await waitFor(() => {
      expect(setApi).toHaveBeenCalled();
    });
  });

  test('does not throw when arrow keys are pressed inside it', async () => {
    const region = await component.findByRole('region', { name: 'Gallery' });

    region.focus();
    await userEvent.keyboard('{ArrowRight}{ArrowLeft}');

    expect(region).toBeInTheDocument();
  });
});
