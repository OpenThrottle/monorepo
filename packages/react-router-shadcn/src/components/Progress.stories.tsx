import type { Meta, StoryObj } from '@storybook/react-vite';
import { Progress } from './Progress';

const STEPS = [0, 25, 50, 75, 100];

const meta = {
  args: { value: 60 },
  component: Progress,
  title: 'Components/Progress',
} satisfies Meta<typeof Progress>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="w-80">
      <Progress {...args} />
    </div>
  ),
};

/** The full range, so a fill or rounding regression is obvious at a glance. */
export const Steps: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex w-80 flex-col gap-4">
      {STEPS.map((value) => (
        <div className="flex flex-col gap-1" key={value}>
          <span className="text-muted-foreground text-xs">{value}%</span>
          <Progress value={value} />
        </div>
      ))}
    </div>
  ),
};

/**
 * `value` is optional. With none supplied the indicator sits at zero rather
 * than animating — this is not an indeterminate state.
 */
export const NoValue: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="w-80">
      <Progress />
    </div>
  ),
};
