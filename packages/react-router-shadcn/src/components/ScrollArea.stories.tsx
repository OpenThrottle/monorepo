import type { Meta, StoryObj } from '@storybook/react-vite';
import { ScrollArea } from './ScrollArea';
import { Separator } from './Separator';

const TAGS = Array.from({ length: 40 }, (_value, index) => `build-48${index}`);

const meta = {
  component: ScrollArea,
  parameters: { controls: { disable: true } },
  title: 'Components/ScrollArea',
} satisfies Meta<typeof ScrollArea>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * `ScrollArea` renders its own viewport, `ScrollBar` and corner — you do not
 * compose those yourself. It needs a bounded height from the parent, since it
 * has no intrinsic size.
 */
export const Default: Story = {
  render: () => (
    <ScrollArea className="h-64 w-64 rounded-md border">
      <div className="p-4">
        {TAGS.map((tag) => (
          <div key={tag}>
            <div className="py-1 text-sm">{tag}</div>
            <Separator />
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
};

/** Horizontal overflow uses the same component — the bar follows the axis. */
export const Horizontal: Story = {
  render: () => (
    <ScrollArea className="w-80 rounded-md border">
      <div className="flex gap-3 p-4">
        {TAGS.slice(0, 12).map((tag) => (
          <div
            className="bg-muted flex size-24 shrink-0 items-center justify-center rounded-md text-xs"
            key={tag}
          >
            {tag}
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
};
