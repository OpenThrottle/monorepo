import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';
import { Spinner } from './Spinner';

const SIZES = ['size-3', 'size-4', 'size-6', 'size-10'];

const meta = {
  component: Spinner,
  title: 'Components/Spinner',
} satisfies Meta<typeof Spinner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** An `svg` sized by class, so it scales with whatever it sits in. */
export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-4">
      {SIZES.map((size) => (
        <Spinner className={size} key={size} />
      ))}
    </div>
  ),
};

/** Inside a button it inherits the current text color. */
export const InButton: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-2">
      <Button disabled={true}>
        <Spinner />
        Deploying
      </Button>
      <Button disabled={true} variant="outline">
        <Spinner />
        Deploying
      </Button>
    </div>
  ),
};
