import type { Meta, StoryObj } from '@storybook/react-vite';
import { Separator } from './Separator';

const meta = {
  component: Separator,
  title: 'Components/Separator',
} satisfies Meta<typeof Separator>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-80">
      <Separator />
    </div>
  ),
};

/**
 * `orientation="vertical"` needs a height from the parent — the separator has
 * no intrinsic size of its own.
 */
export const Vertical: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex h-8 items-center gap-4 text-sm">
      <span>Docs</span>
      <Separator orientation="vertical" />
      <span>Guides</span>
      <Separator orientation="vertical" />
      <span>API</span>
    </div>
  ),
};

/**
 * `decorative` defaults to true, which hides it from assistive technology. Pass
 * `decorative={false}` when the rule genuinely separates two regions.
 */
export const Semantic: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex w-80 flex-col gap-4 text-sm">
      <p>Account settings</p>
      <Separator decorative={false} />
      <p>Danger zone</p>
    </div>
  ),
};
