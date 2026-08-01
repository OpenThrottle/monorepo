import * as React from 'react';
import { Form, Link, useNavigation } from 'react-router';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';
import type { RolloutFlagFieldsFragment } from '~/__generated__/graphql';
import { ROLLOUT_COPY } from '~/routing/settings/data/data.copy';
import { RolloutFlagFormFields } from '~/routing/settings/components/RolloutFlagFormFields';

export interface RolloutFlagEditFormProps {
  actionError?: string | null;
  cancelTo: string;
  flag: RolloutFlagFieldsFragment;
}

/**
 * @description Edit + delete form for a single rollout feature flag. Update submits
 * intent=updateRolloutFlag; delete submits intent=deleteRolloutFlag (with confirm).
 */
export const RolloutFlagEditForm = (
  props: RolloutFlagEditFormProps,
): React.ReactElement => {
  const { actionError, cancelTo, flag } = props;

  // Hooks
  const navigation = useNavigation();

  // Setup
  const intent = navigation.formData?.get('intent');
  const updating =
    navigation.state === 'submitting' && intent === 'updateRolloutFlag';
  const deleting =
    navigation.state === 'submitting' && intent === 'deleteRolloutFlag';

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card data-testid="RolloutFlagEditForm">
      <CardHeader>
        <CardTitle className="text-base">{ROLLOUT_COPY.editTitle}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form className="space-y-4" method="post">
          <input name="intent" type="hidden" value="updateRolloutFlag" />
          <input name="id" type="hidden" value={flag.id} />
          <RolloutFlagFormFields flag={flag} idPrefix="edit-rollout-flag" />

          {actionError ? (
            <p className="text-destructive text-sm" role="alert">
              {actionError}
            </p>
          ) : null}

          <div className="flex items-center gap-2">
            <Button disabled={updating} type="submit">
              {updating ? 'Saving…' : ROLLOUT_COPY.saveButton}
            </Button>
            <Button asChild={true} type="button" variant="ghost">
              <Link to={cancelTo}>Cancel</Link>
            </Button>
          </div>
        </Form>

        <Form
          method="post"
          onSubmit={(event) => {
            if (!window.confirm(ROLLOUT_COPY.deleteConfirm)) {
              event.preventDefault();
            }
          }}
        >
          <input name="intent" type="hidden" value="deleteRolloutFlag" />
          <input name="id" type="hidden" value={flag.id} />
          <Button disabled={deleting} type="submit" variant="destructive">
            {deleting ? 'Deleting…' : ROLLOUT_COPY.deleteButton}
          </Button>
        </Form>
      </CardContent>
    </Card>
  );
};
