import type { Meta, StoryObj } from '@storybook/react-vite';

import { Alert } from './Alert';
import { AlertDescription } from './AlertDescription';
import { AlertTitle } from './AlertTitle';

const meta = {
  component: Alert,
  parameters: { controls: { disable: true } },
  title: 'Components/Alert',
} satisfies Meta<typeof Alert>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * `Alert` is a compound family: the root is the surface and `AlertTitle` /
 * `AlertDescription` are separate exports, so the default shows them composed.
 */
export const Default: Story = {
  render: () => (
    <Alert className="w-96">
      <AlertTitle>Heads up</AlertTitle>
      <AlertDescription>
        Something changed that you may want to look at.
      </AlertDescription>
    </Alert>
  ),
};

/** The destructive variant, for states where something is probably broken. */
export const Destructive: Story = {
  render: () => (
    <Alert className="w-96" variant="destructive">
      <AlertTitle>Capture may be broken</AlertTitle>
      <AlertDescription>
        Nothing has arrived from this source in over a day.
      </AlertDescription>
    </Alert>
  ),
};
