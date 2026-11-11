import {
  Carousel as ShadcnCarousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  cn,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { COPY } from '../data/data.copy';
import type { CmsComponentDebug } from '../types';

/**
 * @public
 * @description A looping image carousel with previous/next controls.
 */
export interface CarouselProps {
  /**
   * @default ""
   * @description Classes to be applied on the component.
   * @cmsWidget className
   */
  readonly className?: string;

  /**
   * @default ["https://picsum.photos/id/300/800/200"]
   * @description An array of image URLs.
   */
  readonly images: ReadonlyArray<string>;
}

/**
 * @public
 * @link https://www.embla-carousel.com/api/
 * @description A carousel component built on the shadcn `Carousel` (embla).
 */
export const Carousel = (props: CarouselProps): React.ReactElement => {
  const { className, images } = props;

  // Hooks

  // Setup
  const { label, slideOf, slidePrefix } = COPY.carousel;
  const total = images.length;
  const opts = { loop: true };

  // Handlers

  // Markup
  const slides = images.map((image, index) => {
    const slideLabel = `${slidePrefix} ${index + 1} ${slideOf} ${total}`;

    return (
      // An index prefix keeps keys unique when CMS content repeats a URL.
      <CarouselItem aria-label={slideLabel} key={`${index}:${image}`}>
        <img
          alt={slideLabel}
          className="bg-muted aspect-[4/1] w-full object-cover"
          src={image}
        />
      </CarouselItem>
    );
  });

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <ShadcnCarousel
      aria-label={label}
      className={cn('mx-12', className)}
      opts={opts}
    >
      <CarouselContent>{slides}</CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </ShadcnCarousel>
  );
};

Carousel.debug = {
  className: undefined,
} satisfies CmsComponentDebug;
