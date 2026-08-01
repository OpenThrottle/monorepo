import * as React from 'react';
import { Input, Label } from '@openthrottle/react-router-shadcn';
import type { RolloutFlagFieldsFragment } from '~/__generated__/graphql';
import { ROLLOUT_COPY } from '~/routing/settings/data/data.copy';
import { formatRolloutTargetRoles } from '~/routing/settings/utils/rollout-action';

export interface RolloutFlagFormFieldsProps {
  flag?: RolloutFlagFieldsFragment;
  idPrefix: string;
}

/**
 * @description Shared key/description/enabled/targetRoles inputs for the rollout
 * create dialog and edit form. Uncontrolled (defaultValue) so it works inside a
 * plain <Form method="post">.
 */
export const RolloutFlagFormFields = (
  props: RolloutFlagFormFieldsProps,
): React.ReactElement => {
  const { flag, idPrefix } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-key`}>{ROLLOUT_COPY.keyLabel}</Label>
        <Input
          defaultValue={flag?.key ?? ''}
          id={`${idPrefix}-key`}
          name="key"
          placeholder={ROLLOUT_COPY.keyPlaceholder}
          required={true}
        />
        <p className="text-muted-foreground text-xs">{ROLLOUT_COPY.keyHelp}</p>
      </div>

      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-description`}>
          {ROLLOUT_COPY.descriptionLabel}
        </Label>
        <Input
          defaultValue={flag?.description ?? ''}
          id={`${idPrefix}-description`}
          name="description"
          placeholder={ROLLOUT_COPY.descriptionPlaceholder}
        />
        <p className="text-muted-foreground text-xs">
          {ROLLOUT_COPY.descriptionHelp}
        </p>
      </div>

      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-target-roles`}>
          {ROLLOUT_COPY.targetRolesLabel}
        </Label>
        <Input
          defaultValue={formatRolloutTargetRoles(flag?.targetRoles ?? [])}
          id={`${idPrefix}-target-roles`}
          name="targetRoles"
          placeholder={ROLLOUT_COPY.targetRolesPlaceholder}
        />
        <p className="text-muted-foreground text-xs">
          {ROLLOUT_COPY.targetRolesHelp}
        </p>
      </div>

      <div className="flex items-start gap-2">
        <input
          className="mt-1"
          defaultChecked={flag?.enabled ?? false}
          id={`${idPrefix}-enabled`}
          name="enabled"
          type="checkbox"
          value="true"
        />
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-enabled`}>
            {ROLLOUT_COPY.enabledLabel}
          </Label>
          <p className="text-muted-foreground text-xs">
            {ROLLOUT_COPY.enabledHelp}
          </p>
        </div>
      </div>
    </div>
  );
};
