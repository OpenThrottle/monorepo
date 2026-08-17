import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../Button';
import { Empty } from './Empty';
import { EmptyContent } from './EmptyContent';
import { EmptyDescription } from './EmptyDescription';
import { EmptyHeader } from './EmptyHeader';
import { EmptyMedia, type EmptyMediaProps } from './EmptyMedia';
import { EmptyTitle } from './EmptyTitle';

const MEDIA_VARIANTS: readonly NonNullable<EmptyMediaProps['variant']>[] = [
  'default',
  'icon',
];

const meta = {
  component: Empty,
  parameters: { controls: { disable: true } },
  title: 'Components/Empty',
} satisfies Meta<typeof Empty>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The empty-state family, composed the way a route uses it: media, title,
 * description, then the action that resolves the emptiness.
 */
export const Default: Story = {
  render: () => (
    <Empty className="w-96">
      <EmptyHeader>
        <EmptyMedia variant="icon">📦</EmptyMedia>
        <EmptyTitle>No builds yet</EmptyTitle>
        <EmptyDescription>
          Push a branch and the first build starts automatically.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button>Read the guide</Button>
      </EmptyContent>
    </Empty>
  ),
};

/**
 * `EmptyMedia` is the only part with a `cva` map: `icon` gives the muted
 * rounded tile, `default` leaves the media bare.
 */
export const MediaVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      {MEDIA_VARIANTS.map((variant) => (
        <div className="flex flex-col gap-2" key={variant}>
          <span className="text-muted-foreground text-xs font-medium">
            {variant}
          </span>
          <Empty className="w-96">
            <EmptyHeader>
              <EmptyMedia variant={variant}>📦</EmptyMedia>
              <EmptyTitle>No builds yet</EmptyTitle>
            </EmptyHeader>
          </Empty>
        </div>
      ))}
    </div>
  ),
};

/** Title only — the minimum that still reads as an intentional empty state. */
export const TitleOnly: Story = {
  render: () => (
    <Empty className="w-96">
      <EmptyHeader>
        <EmptyTitle>No results</EmptyTitle>
      </EmptyHeader>
    </Empty>
  ),
};
