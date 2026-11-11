import type { Meta, StoryObj } from '@storybook/react-vite';

import { Carousel } from './Carousel';
import { CarouselContent } from './CarouselContent';
import { CarouselItem } from './CarouselItem';
import { CarouselNext } from './CarouselNext';
import { CarouselPrevious } from './CarouselPrevious';

const meta = {
  component: Carousel,
  parameters: { controls: { disable: true } },
  title: 'Components/Carousel',
} satisfies Meta<typeof Carousel>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * `Carousel` is a compound family built on embla: the root owns the embla
 * instance and keyboard handling, `CarouselContent` is the viewport, and the
 * previous/next buttons read scroll state from context.
 */
export const Default: Story = {
  render: () => (
    <Carousel className="mx-12 w-64">
      <CarouselContent>
        {['One', 'Two', 'Three'].map((label) => (
          <CarouselItem key={label}>
            <div className="flex aspect-square items-center justify-center rounded-md border text-2xl">
              {label}
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  ),
};

export const Looping: Story = {
  render: () => (
    <Carousel className="mx-12 w-64" opts={{ loop: true }}>
      <CarouselContent>
        {['One', 'Two', 'Three'].map((label) => (
          <CarouselItem key={label}>
            <div className="flex aspect-square items-center justify-center rounded-md border text-2xl">
              {label}
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  ),
};
