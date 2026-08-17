import type { Meta, StoryObj } from '@storybook/react-vite';
import { Avatar, AvatarFallback } from './Avatar';
import { Button } from './Button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from './HoverCard';

const meta = {
  component: HoverCard,
  parameters: { controls: { disable: true } },
  title: 'Components/HoverCard',
} satisfies Meta<typeof HoverCard>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Hover-triggered like `Tooltip`, but it holds rich content rather than a
 * string — and unlike a popover it is not click-activated, so it should never
 * be the only route to an action.
 */
export const Default: Story = {
  render: () => (
    <HoverCard>
      <HoverCardTrigger asChild={true}>
        <Button variant="link">@visormatt</Button>
      </HoverCardTrigger>
      <HoverCardContent className="w-72">
        <div className="flex gap-3">
          <Avatar>
            <AvatarFallback>MS</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">Matt Scholta</span>
            <span className="text-muted-foreground text-xs">
              Maintains the OpenThrottle monorepo.
            </span>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  ),
};

export const Open: Story = {
  render: () => (
    <div className="p-16">
      <HoverCard defaultOpen={true}>
        <HoverCardTrigger asChild={true}>
          <Button variant="link">Pinned open</Button>
        </HoverCardTrigger>
        <HoverCardContent>Shown without hovering.</HoverCardContent>
      </HoverCard>
    </div>
  ),
};
