'use client';

import * as React from 'react';

import { cn } from '../../utils/cn';
import { useCarousel } from './useCarousel';

export interface CarouselItemProps extends React.ComponentProps<'div'> {}

export const CarouselItem = (props: CarouselItemProps): React.ReactElement => {
  const { className, ...rest } = props;

  // Hooks
  const { orientation } = useCarousel();

  // Setup
  const isHorizontal = orientation === 'horizontal';

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      aria-roledescription="slide"
      className={cn(
        'min-w-0 shrink-0 grow-0 basis-full',
        isHorizontal ? 'pl-4' : 'pt-4',
        className,
      )}
      data-slot="carousel-item"
      role="group"
      {...rest}
    />
  );
};
