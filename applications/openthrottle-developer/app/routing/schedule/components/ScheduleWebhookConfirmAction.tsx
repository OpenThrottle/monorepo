import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { Form, useNavigation } from 'react-router';

export interface ScheduleWebhookConfirmActionProps {
  readonly confirmLabel: string;
  readonly description: string;
  /** The form intent the detail route's action switches on. */
  readonly intent: 'webhook-delete' | 'webhook-rotate';
  readonly title: string;
  /** The trigger button's label. */
  readonly triggerLabel: string;
  readonly variant: 'destructive' | 'outline';
}

/**
 * @description A button that asks before it posts a destructive webhook intent (rotate or delete).
 * Rotation replaces the URL token and the secret together and breaks the old URL immediately, so it
 * never fires from one click: the dialog says so and only its confirm button submits. The dialog
 * closes once the submission settles.
 */
export const ScheduleWebhookConfirmAction = (
  props: ScheduleWebhookConfirmActionProps,
): React.ReactElement => {
  const { confirmLabel, description, intent, title, triggerLabel, variant } =
    props;

  // Hooks
  const [open, setOpen] = React.useState(false);
  const busyRef = React.useRef(false);
  const navigation = useNavigation();

  // Setup
  const isSubmitting = navigation.state !== 'idle';

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    if (busyRef.current && !isSubmitting) {
      setOpen(false);
    }
    busyRef.current = isSubmitting;
  }, [isSubmitting]);

  // 🔌 Short Circuit

  return (
    <AlertDialog onOpenChange={setOpen} open={open}>
      <AlertDialogTrigger asChild={true}>
        <Button size="xs" type="button" variant={variant}>
          {triggerLabel}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <Form method="post">
          <input name="intent" type="hidden" value={intent} />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting} type="button">
              Cancel
            </AlertDialogCancel>
            <Button disabled={isSubmitting} type="submit" variant="destructive">
              {confirmLabel}
            </Button>
          </AlertDialogFooter>
        </Form>
      </AlertDialogContent>
    </AlertDialog>
  );
};
