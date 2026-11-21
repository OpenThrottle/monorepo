import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { Form } from 'react-router';

import type { ScheduleWebhookTriggerFragment } from '~/__generated__/graphql';
import { ScheduleWebhookCustomFields } from '~/routing/schedule/components/ScheduleWebhookCustomFields';
import { ScheduleWebhookFilterRows } from '~/routing/schedule/components/ScheduleWebhookFilterRows';
import { ScheduleWebhookSigningGuide } from '~/routing/schedule/components/ScheduleWebhookSigningGuide';
import { SCHEDULE_WEBHOOK_COPY } from '~/routing/schedule/data/data.copy';
import {
  WEBHOOK_LIMITS,
  WEBHOOK_PRESET,
  WEBHOOK_PRESET_OPTIONS,
} from '~/routing/schedule/data/data.webhook';

export interface ScheduleWebhookFormProps {
  /** Action-level error to show inline (validation, or the server refusing). */
  readonly error: string | undefined;
  /** The existing trigger to edit; undefined creates one. */
  readonly trigger: ScheduleWebhookTriggerFragment | undefined;
}

/**
 * @description Create or edit a job's webhook trigger: signature preset (with its signing
 * instructions and, for `custom`, the header fields), timestamp tolerance, filters, coalesce window,
 * rate limit, max in flight and the ingress on/off switch. Posts `webhook-create` or `webhook-update`
 * to the detail route. The URL token and secret are not editable here; rotate replaces them.
 */
export const ScheduleWebhookForm = (
  props: ScheduleWebhookFormProps,
): React.ReactElement => {
  const { error, trigger } = props;

  // Hooks
  const [preset, setPreset] = React.useState<string>(
    trigger?.signaturePreset ?? WEBHOOK_PRESET.generic,
  );

  // Setup
  const isCreate = trigger === undefined;
  const hasTimestamp = preset !== WEBHOOK_PRESET.github;
  const intent = isCreate ? 'webhook-create' : 'webhook-update';
  const submitLabel = isCreate
    ? SCHEDULE_WEBHOOK_COPY.createAction
    : SCHEDULE_WEBHOOK_COPY.saveAction;

  // Handlers

  // Markup
  const customFields = <ScheduleWebhookCustomFields trigger={trigger} />;
  const toleranceField = (
    <div>
      <Label htmlFor="timestampToleranceSeconds">
        {SCHEDULE_WEBHOOK_COPY.toleranceLabel}
      </Label>
      <Input
        defaultValue={
          trigger?.timestampToleranceSeconds ??
          WEBHOOK_LIMITS.defaultToleranceSeconds
        }
        id="timestampToleranceSeconds"
        max={WEBHOOK_LIMITS.toleranceMaxSeconds}
        min={WEBHOOK_LIMITS.toleranceMinSeconds}
        name="timestampToleranceSeconds"
        type="number"
      />
      <p className="text-muted-foreground mt-1 text-xs">
        {SCHEDULE_WEBHOOK_COPY.toleranceHelp}
      </p>
    </div>
  );
  const errorAlert = (
    <p className="text-destructive text-sm" role="alert">
      {error}
    </p>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Form
      className="w-full max-w-2xl space-y-4"
      data-testid="ScheduleWebhookForm"
      method="post"
    >
      <input name="intent" type="hidden" value={intent} />

      <div>
        <Label htmlFor="signaturePreset">
          {SCHEDULE_WEBHOOK_COPY.presetLabel}
        </Label>
        <Select name="signaturePreset" onValueChange={setPreset} value={preset}>
          <SelectTrigger
            aria-label={SCHEDULE_WEBHOOK_COPY.presetLabel}
            id="signaturePreset"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WEBHOOK_PRESET_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ScheduleWebhookSigningGuide preset={preset} />

      {preset === WEBHOOK_PRESET.custom ? customFields : null}
      {hasTimestamp ? toleranceField : null}

      <ScheduleWebhookFilterRows filters={trigger?.filters ?? []} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="coalesceWindowSeconds">
            {SCHEDULE_WEBHOOK_COPY.coalesceLabel}
          </Label>
          <Input
            defaultValue={
              (trigger?.coalesceWindowMs ??
                WEBHOOK_LIMITS.defaultCoalesceSeconds * 1000) / 1000
            }
            id="coalesceWindowSeconds"
            max={WEBHOOK_LIMITS.coalesceMaxSeconds}
            min={0}
            name="coalesceWindowSeconds"
            type="number"
          />
        </div>
        <div>
          <Label htmlFor="rateLimitPerMinute">
            {SCHEDULE_WEBHOOK_COPY.rateLimitLabel}
          </Label>
          <Input
            defaultValue={
              trigger?.rateLimitPerMinute ??
              WEBHOOK_LIMITS.defaultRateLimitPerMinute
            }
            id="rateLimitPerMinute"
            max={WEBHOOK_LIMITS.rateLimitMax}
            min={1}
            name="rateLimitPerMinute"
            type="number"
          />
        </div>
        <div>
          <Label htmlFor="maxInFlight">
            {SCHEDULE_WEBHOOK_COPY.maxInFlightLabel}
          </Label>
          <Input
            defaultValue={
              trigger?.maxInFlight ?? WEBHOOK_LIMITS.defaultMaxInFlight
            }
            id="maxInFlight"
            max={WEBHOOK_LIMITS.maxInFlightMax}
            min={1}
            name="maxInFlight"
            type="number"
          />
        </div>
      </div>
      <p className="text-muted-foreground text-xs">
        {SCHEDULE_WEBHOOK_COPY.coalesceHelp}{' '}
        {SCHEDULE_WEBHOOK_COPY.rateLimitHelp}{' '}
        {SCHEDULE_WEBHOOK_COPY.maxInFlightHelp}
      </p>

      <label className="flex items-center gap-2 text-sm">
        <input
          defaultChecked={trigger?.enabled ?? true}
          name="enabled"
          type="checkbox"
          value="true"
        />
        {SCHEDULE_WEBHOOK_COPY.enabledLabel}
      </label>

      {error ? errorAlert : null}

      <Button type="submit">{submitLabel}</Button>
    </Form>
  );
};
