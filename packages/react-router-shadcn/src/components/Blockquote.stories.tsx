import type { Meta, StoryObj } from '@storybook/react-vite';
import { Blockquote } from './Blockquote';

const meta = {
  args: {
    children:
      'The workbench is the only place the component library can be seen across every theme at once.',
  },
  component: Blockquote,
  title: 'Components/Blockquote',
} satisfies Meta<typeof Blockquote>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="w-96">
      <Blockquote {...args} />
    </div>
  ),
};

/** In flowing copy, which is where the left border and spacing have to work. */
export const InProse: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex w-96 flex-col gap-4 text-sm">
      <p>Every visual check used to mean booting a consuming application.</p>
      <Blockquote>
        A story is documentation, not a component — no section markers, no
        forwardRef signature, no paired Props interface.
      </Blockquote>
      <p>That exemption was settled before the first story existed.</p>
    </div>
  ),
};
