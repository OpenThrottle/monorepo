'use client';

import * as React from 'react';

import { useCarousel } from '../../hooks/useCarousel';
import { cn } from '../../utils/cn';

export interface CarouselContentProps extends React.ComponentProps<'div'> {}

export const CarouselContent = (
  props: CarouselContentProps,
): React.ReactElement => {
  const { className, ...rest } = props;

  // Hooks
  const { carouselRef, orientation } = useCarousel();

  // Setup
  const isHorizontal = orientation === 'horizontal';

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className="overflow-hidden"
      data-slot="carousel-content"
      ref={carouselRef}
    >
      <div
        className={cn(
          'flex',
          isHorizontal ? '-ml-4' : '-mt-4 flex-col',
          className,
        )}
        {...rest}
      />
    </div>
  );
};
