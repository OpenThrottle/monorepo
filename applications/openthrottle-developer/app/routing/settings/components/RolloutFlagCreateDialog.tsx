import * as React from 'react';
import { Form, useNavigation } from 'react-router';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@openthrottle/react-router-shadcn';
import { ROLLOUT_COPY } from '~/routing/settings/data/data.copy';
import { RolloutFlagFormFields } from '~/routing/settings/components/RolloutFlagFormFields';

export interface RolloutFlagCreateDialogProps {
  actionError?: string | null;
}

/**
 * @description Dialog + <Form method="post"> to create a rollout flag
 * (intent=createRolloutFlag). Closes on a successful (non-error) submit.
 */
export const RolloutFlagCreateDialog = (
  props: RolloutFlagCreateDialogProps,
): React.ReactElement => {
  const { actionError } = props;

  // Hooks
  const [open, setOpen] = React.useState(false);
  const navigation = useNavigation();

  // Setup
  const submitting =
    navigation.state === 'submitting' &&
    navigation.formData?.get('intent') === 'createRolloutFlag';
  const wasSubmitting = React.useRef(false);

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    if (submitting) {
      wasSubmitting.current = true;
      return;
    }
    if (wasSubmitting.current && navigation.state === 'idle' && !actionError) {
      wasSubmitting.current = false;
      setOpen(false);
    }
  }, [actionError, navigation.state, submitting]);

  // 🔌 Short Circuit

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild={true}>
        <Button type="button">{ROLLOUT_COPY.createButton}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{ROLLOUT_COPY.createTitle}</DialogTitle>
          <DialogDescription>
            {ROLLOUT_COPY.createDescription}
          </DialogDescription>
        </DialogHeader>
        <Form className="space-y-4" method="post">
          <input name="intent" type="hidden" value="createRolloutFlag" />
          <RolloutFlagFormFields idPrefix="create-rollout-flag" />
          {actionError ? (
            <p className="text-destructive text-sm" role="alert">
              {actionError}
            </p>
          ) : null}
          <DialogFooter>
            <Button disabled={submitting} type="submit">
              {submitting ? 'Creating…' : ROLLOUT_COPY.createButton}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
