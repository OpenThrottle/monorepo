import type { Meta, StoryObj } from '@storybook/react-vite';
import { Kbd, KbdGroup } from './Kbd';

const meta = {
  args: { children: '⌘' },
  component: Kbd,
  title: 'Components/Kbd',
} satisfies Meta<typeof Kbd>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** `KbdGroup` spaces a chord so the keys read as one shortcut. */
export const Chord: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <KbdGroup>
      <Kbd>⌘</Kbd>
      <Kbd>K</Kbd>
    </KbdGroup>
  ),
};

export const InlineWithText: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <p className="text-sm">
      Press{' '}
      <KbdGroup>
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </KbdGroup>{' '}
      to open the command palette, or <Kbd>Esc</Kbd> to dismiss it.
    </p>
  ),
};
