'use client';

import * as React from 'react';

import type { CarouselContextProps } from './carousel-context';
import { CarouselContext } from './carousel-context';

export function useCarousel(): CarouselContextProps {
  const context = React.useContext(CarouselContext);
  if (!context) {
    throw new Error('useCarousel must be used within a <Carousel />.');
  }

  return context;
}
