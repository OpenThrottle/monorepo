'use client';

import type useEmblaCarousel from 'embla-carousel-react';
import type { UseEmblaCarouselType } from 'embla-carousel-react';
import * as React from 'react';

export type CarouselApi = UseEmblaCarouselType[1];

export type CarouselOptions = Parameters<typeof useEmblaCarousel>[0];

export type CarouselOrientation = 'horizontal' | 'vertical';

export interface CarouselContextProps {
  readonly api: CarouselApi;
  readonly canScrollNext: boolean;
  readonly canScrollPrev: boolean;
  readonly carouselRef: UseEmblaCarouselType[0];
  readonly orientation: CarouselOrientation;
  readonly scrollNext: () => void;
  readonly scrollPrev: () => void;
}

export const CarouselContext = React.createContext<CarouselContextProps | null>(
  null,
);
