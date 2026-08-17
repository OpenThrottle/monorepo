import type { Meta, StoryObj } from '@storybook/react-vite';
import { Skeleton } from './Skeleton';

const meta = {
  component: Skeleton,
  title: 'Components/Skeleton',
} satisfies Meta<typeof Skeleton>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Shape comes entirely from `className` — the component only supplies the pulse. */
export const Default: Story = {
  render: () => <Skeleton className="h-4 w-48" />,
};

/** A loading placeholder shaped like the content it stands in for. */
export const CardPlaceholder: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex w-80 flex-col gap-3 rounded-md border p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
    </div>
  ),
};
