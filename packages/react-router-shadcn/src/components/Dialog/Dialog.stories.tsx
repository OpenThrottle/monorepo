import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../Button';
import { Input } from '../Input';
import { Label } from '../Label';
import { Dialog } from './Dialog';
import { DialogContent } from './DialogContent';
import { DialogDescription } from './DialogDescription';
import { DialogFooter } from './DialogFooter';
import { DialogHeader } from './DialogHeader';
import { DialogTitle } from './DialogTitle';
import { DialogTrigger } from './DialogTrigger';

const meta = {
  component: Dialog,
  parameters: { controls: { disable: true } },
  title: 'Components/Dialog',
} satisfies Meta<typeof Dialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Dialog renders through a portal, so its content is NOT inside the story's
 * DOM subtree until it opens — which is exactly why it is worth having here:
 * portal and overlay behaviour is the part jsdom tests exercise least well.
 * Click the trigger to mount the overlay.
 */
export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild={true}>
        <Button>Rename project</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename project</DialogTitle>
          <DialogDescription>
            The new name is used in URLs and cannot be changed again for 24
            hours.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="workbench-dialog-name">Project name</Label>
          <Input defaultValue="openthrottle" id="workbench-dialog-name" />
        </div>
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

/**
 * `defaultOpen` mounts the dialog immediately, so the Docs page and any
 * screenshot show the open state without an interaction step.
 */
export const Open: Story = {
  render: () => (
    <Dialog defaultOpen={true}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete build artifacts</DialogTitle>
          <DialogDescription>
            This removes 1.2 GB across 14 builds. Artifacts referenced by an
            open pull request are kept.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button variant="destructive">Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

/** Long bodies scroll inside the content rather than growing the overlay. */
export const ScrollingContent: Story = {
  render: () => (
    <Dialog defaultOpen={true}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Release notes</DialogTitle>
          <DialogDescription>Everything in 4.8.0.</DialogDescription>
        </DialogHeader>
        <div className="max-h-64 overflow-y-auto pr-2 text-sm">
          {Array.from({ length: 24 }, (_value, index) => (
            <p className="py-1" key={index}>
              Change {index + 1} — a line of release notes long enough to make
              the container scroll.
            </p>
          ))}
        </div>
        <DialogFooter>
          <Button>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};
