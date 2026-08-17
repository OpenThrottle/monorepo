import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../Button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './index';

const meta = {
  component: AlertDialog,
  parameters: { controls: { disable: true } },
  title: 'Components/AlertDialog',
} satisfies Meta<typeof AlertDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The confirmation counterpart to `Dialog`: it traps focus and has no dismiss
 * affordance beyond its own actions, so a destructive step cannot be dismissed
 * by accident. Use `Dialog` for anything that is not a confirmation.
 */
export const Default: Story = {
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger asChild={true}>
        <Button variant="destructive">Delete project</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this project?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes every build, artifact and deploy history. It cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};

/** `defaultOpen` so the Docs page shows the open state without interaction. */
export const Open: Story = {
  render: () => (
    <AlertDialog defaultOpen={true}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revoke the deploy key?</AlertDialogTitle>
          <AlertDialogDescription>
            Any pipeline using this key stops working immediately.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction>Revoke</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};
