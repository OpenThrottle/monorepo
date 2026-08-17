import type { Meta, StoryObj } from '@storybook/react-vite';
import { InputGroup } from './InputGroup';
import { InputGroupAddon, type InputGroupAddonProps } from './InputGroupAddon';
import { InputGroupButton } from './InputGroupButton';
import { InputGroupInput } from './InputGroupInput';
import { InputGroupText } from './InputGroupText';
import { InputGroupTextarea } from './InputGroupTextarea';
import { Kbd } from './Kbd';

const ALIGNMENTS: readonly NonNullable<InputGroupAddonProps['align']>[] = [
  'inline-start',
  'inline-end',
  'block-start',
  'block-end',
];

const meta = {
  component: InputGroup,
  parameters: { controls: { disable: true } },
  title: 'Components/InputGroup',
} satisfies Meta<typeof InputGroup>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The whole family in the arrangement apps use: the group owns the border and
 * focus ring, `InputGroupInput` is borderless inside it, and addons attach to
 * an edge. Note the input is `InputGroupInput`, not the standalone `Input` —
 * the plain one would draw a second border.
 */
export const Default: Story = {
  render: () => (
    <div className="w-96">
      <InputGroup>
        <InputGroupAddon>
          <InputGroupText>🔍</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput placeholder="Search components…" />
        <InputGroupAddon align="inline-end">
          <Kbd>⌘K</Kbd>
        </InputGroupAddon>
      </InputGroup>
    </div>
  ),
};

/**
 * `align` is the addon's only `cva` axis. `inline-*` sits beside the control;
 * `block-*` takes a full row above or below it.
 */
export const AddonAlignment: Story = {
  render: () => (
    <div className="flex w-96 flex-col gap-6">
      {ALIGNMENTS.map((align) => (
        <div className="flex flex-col gap-2" key={align}>
          <span className="text-muted-foreground text-xs font-medium">
            {align}
          </span>
          <InputGroup>
            <InputGroupAddon align={align}>
              <InputGroupText>{align}</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput placeholder="Search…" />
          </InputGroup>
        </div>
      ))}
    </div>
  ),
};

/** `InputGroupButton` is sized to sit inside the group without breaking it. */
export const WithButton: Story = {
  render: () => (
    <div className="w-96">
      <InputGroup>
        <InputGroupInput placeholder="you@example.com" />
        <InputGroupAddon align="inline-end">
          <InputGroupButton size="sm">Invite</InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
  ),
};

/** `InputGroupTextarea` swaps the single-line control for a multi-line one. */
export const WithTextarea: Story = {
  render: () => (
    <div className="w-96">
      <InputGroup>
        <InputGroupTextarea placeholder="Describe what changed…" rows={4} />
        <InputGroupAddon align="block-end">
          <InputGroupButton size="sm">Comment</InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
  ),
};
