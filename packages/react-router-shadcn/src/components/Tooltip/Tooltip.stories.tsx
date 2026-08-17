import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../Button';
import { Tooltip } from './Tooltip';
import { TooltipContent } from './TooltipContent';
import { TooltipProvider } from './TooltipProvider';
import { TooltipTrigger } from './TooltipTrigger';

const SIDES = ['top', 'right', 'bottom', 'left'] as const;

const meta = {
  component: Tooltip,
  parameters: { controls: { disable: true } },
  title: 'Components/Tooltip',
} satisfies Meta<typeof Tooltip>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * `TooltipProvider` is required — it owns the shared open/close delay for every
 * tooltip beneath it. Apps usually mount one high in the tree; each story mounts
 * its own so it stands alone. Content is portalled, so it only enters the DOM on
 * hover or focus.
 */
export const Default: Story = {
  render: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild={true}>
          <Button variant="outline">Hover me</Button>
        </TooltipTrigger>
        <TooltipContent>Runs the full suite, not just affected.</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};

/** `defaultOpen` pins it open so the Docs page shows the content. */
export const Open: Story = {
  render: () => (
    <TooltipProvider>
      <Tooltip defaultOpen={true}>
        <TooltipTrigger asChild={true}>
          <Button variant="outline">Always open</Button>
        </TooltipTrigger>
        <TooltipContent>Pinned open for documentation.</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};

/** Placement is a `TooltipContent` prop; the arrow follows automatically. */
export const Sides: Story = {
  render: () => (
    <TooltipProvider>
      <div className="flex flex-wrap items-center gap-4 p-16">
        {SIDES.map((side) => (
          <Tooltip defaultOpen={true} key={side}>
            <TooltipTrigger asChild={true}>
              <Button variant="outline">{side}</Button>
            </TooltipTrigger>
            <TooltipContent side={side}>Placed {side}.</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  ),
};

/**
 * `delayDuration` on the provider governs how long a pointer must rest before
 * the tooltip opens — set to 0 here, the default is longer.
 */
export const NoDelay: Story = {
  render: () => (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild={true}>
          <Button variant="outline">Opens immediately</Button>
        </TooltipTrigger>
        <TooltipContent>No hover delay.</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};
