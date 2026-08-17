import type { Meta, StoryObj } from '@storybook/react-vite';
import { Markdown } from './Markdown';

const SAMPLE = `# Component workbench

Stories live beside the component they document.

- Button
- Badge
- Card
`;

const meta = {
  args: { content: SAMPLE },
  component: Markdown,
  title: 'Components/Markdown',
} satisfies Meta<typeof Markdown>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Despite the name this does NOT parse Markdown — it renders the content
 * verbatim inside a `pre`/`code` block. Worth knowing before reaching for it as
 * a renderer.
 */
export const Default: Story = {
  render: (args) => (
    <div className="w-96">
      <Markdown {...args} />
    </div>
  ),
};

/** A non-string `content` is JSON-stringified, which is the debug-view use. */
export const ObjectContent: Story = {
  args: {
    content: { size: 'lg', slot: 'button', variant: 'destructive' },
  },
  render: (args) => (
    <div className="w-96">
      <Markdown {...args} />
    </div>
  ),
};

export const Editable: Story = {
  args: { content: SAMPLE, contentEditable: true },
  render: (args) => (
    <div className="w-96 rounded-md border p-2">
      <Markdown {...args} />
    </div>
  ),
};
