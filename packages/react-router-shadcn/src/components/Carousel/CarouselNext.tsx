'use client';

import { ArrowRight } from 'lucide-react';
import * as React from 'react';

import { useCarousel } from '../../hooks/useCarousel';
import { cn } from '../../utils/cn';
import type { ButtonProps } from '../Button';
import { Button } from '../Button';

export interface CarouselNextProps extends ButtonProps {}

export const CarouselNext = (props: CarouselNextProps): React.ReactElement => {
  const { className, size = 'icon', variant = 'outline', ...rest } = props;

  // Hooks
  const { canScrollNext, orientation, scrollNext } = useCarousel();

  // Setup
  const isHorizontal = orientation === 'horizontal';
  const position = isHorizontal
    ? 'top-1/2 -right-12 -translate-y-1/2'
    : '-bottom-12 left-1/2 -translate-x-1/2 rotate-90';

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Button
      className={cn('absolute size-8 rounded-full', position, className)}
      data-slot="carousel-next"
      disabled={!canScrollNext}
      onClick={scrollNext}
      size={size}
      variant={variant}
      {...rest}
    >
      <ArrowRight />
      <span className="sr-only">Next slide</span>
    </Button>
  );
};
