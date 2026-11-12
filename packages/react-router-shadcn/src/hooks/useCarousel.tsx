'use client';

import * as React from 'react';

import type { CarouselContextProps } from '../components/Carousel/CarouselContext';
import { CarouselContext } from '../components/Carousel/CarouselContext';

export interface UseCarouselResult extends CarouselContextProps {}

/**
 * @description Reads the nearest `<Carousel />` context: the embla API, scroll
 * state and the prev/next handlers. Throws outside a `<Carousel />`.
 */
export const useCarousel = (): UseCarouselResult => {
  // Hooks
  const context = React.useContext(CarouselContext);

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (!context) {
    throw new Error('useCarousel must be used within a <Carousel />.');
  }

  return context;
};
