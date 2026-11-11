'use client';

import { ArrowLeft } from 'lucide-react';
import * as React from 'react';

import { useCarousel } from '../../hooks/useCarousel';
import { cn } from '../../utils/cn';
import type { ButtonProps } from '../Button';
import { Button } from '../Button';

export interface CarouselPreviousProps extends ButtonProps {}

export const CarouselPrevious = (
  props: CarouselPreviousProps,
): React.ReactElement => {
  const { className, size = 'icon', variant = 'outline', ...rest } = props;

  // Hooks
  const { canScrollPrev, orientation, scrollPrev } = useCarousel();

  // Setup
  const isHorizontal = orientation === 'horizontal';
  const position = isHorizontal
    ? 'top-1/2 -left-12 -translate-y-1/2'
    : '-top-12 left-1/2 -translate-x-1/2 rotate-90';

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Button
      className={cn('absolute size-8 rounded-full', position, className)}
      data-slot="carousel-previous"
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      size={size}
      variant={variant}
      {...rest}
    >
      <ArrowLeft />
      <span className="sr-only">Previous slide</span>
    </Button>
  );
};
