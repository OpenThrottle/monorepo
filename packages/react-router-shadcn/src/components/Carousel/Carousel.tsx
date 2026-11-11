'use client';

import useEmblaCarousel from 'embla-carousel-react';
import * as React from 'react';

import { cn } from '../../utils/cn';
import type {
  CarouselApi,
  CarouselContextProps,
  CarouselOptions,
  CarouselOrientation,
} from './carousel-context';
import { CarouselContext } from './carousel-context';

export interface CarouselProps extends React.ComponentProps<'div'> {
  readonly opts?: CarouselOptions;
  readonly orientation?: CarouselOrientation;
  readonly setApi?: (api: CarouselApi) => void;
}

export const Carousel = (props: CarouselProps): React.ReactElement => {
  const {
    children,
    className,
    opts,
    orientation = 'horizontal',
    setApi,
    ...rest
  } = props;

  // Hooks
  const isHorizontal = orientation === 'horizontal';
  const [carouselRef, api] = useEmblaCarousel({
    ...opts,
    axis: isHorizontal ? 'x' : 'y',
  });
  const [canScrollPrev, setCanScrollPrev] = React.useState(false);
  const [canScrollNext, setCanScrollNext] = React.useState(false);

  // Setup

  // Handlers
  const onSelect = React.useCallback((selected: CarouselApi) => {
    if (!selected) return;
    setCanScrollPrev(selected.canScrollPrev());
    setCanScrollNext(selected.canScrollNext());
  }, []);

  const scrollPrev = React.useCallback(() => {
    api?.scrollPrev();
  }, [api]);

  const scrollNext = React.useCallback(() => {
    api?.scrollNext();
  }, [api]);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        scrollPrev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        scrollNext();
      }
    },
    [scrollNext, scrollPrev],
  );

  const context: CarouselContextProps = React.useMemo(() => {
    return {
      api,
      canScrollNext,
      canScrollPrev,
      carouselRef,
      orientation,
      scrollNext,
      scrollPrev,
    };
  }, [
    api,
    canScrollNext,
    canScrollPrev,
    carouselRef,
    orientation,
    scrollNext,
    scrollPrev,
  ]);

  // Markup

  // Life Cycle
  React.useEffect(() => {
    if (!api || !setApi) return;
    setApi(api);
  }, [api, setApi]);

  React.useEffect(() => {
    if (!api) return;
    onSelect(api);
    api.on('reInit', onSelect);
    api.on('select', onSelect);

    return () => {
      api.off('reInit', onSelect);
      api.off('select', onSelect);
    };
  }, [api, onSelect]);

  // 🔌 Short Circuit

  return (
    <CarouselContext.Provider value={context}>
      <div
        aria-roledescription="carousel"
        className={cn('relative', className)}
        data-slot="carousel"
        onKeyDownCapture={handleKeyDown}
        role="region"
        {...rest}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  );
};
