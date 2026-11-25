import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import type { ScheduleWebhookTriggerFragment } from '~/__generated__/graphql';
import { SCHEDULE_WEBHOOK_COPY } from '~/routing/schedule/data/copy';
import { WEBHOOK_ENCODING_OPTIONS } from '~/routing/schedule/data/webhook';

export interface ScheduleWebhookCustomFieldsProps {
  /** The existing trigger being edited; undefined on create. */
  readonly trigger:
    | Pick<
        ScheduleWebhookTriggerFragment,
        | 'deliveryIdHeader'
        | 'signatureEncoding'
        | 'signatureHeader'
        | 'timestampHeader'
      >
    | undefined;
}

/**
 * @description The fields only the `custom` preset uses: which header carries the signature, how the
 * digest is encoded, and the optional timestamp and delivery-id headers. The `generic` and `github`
 * presets fix their own headers, so the form renders this only for `custom`.
 */
export const ScheduleWebhookCustomFields = (
  props: ScheduleWebhookCustomFieldsProps,
): React.ReactElement => {
  const { trigger } = props;

  // Hooks

  // Setup
  const selectedEncoding = trigger?.signatureEncoding ?? 'hex';
  const encodingLabel = WEBHOOK_ENCODING_OPTIONS.find(
    (option) => option.value === selectedEncoding,
  )?.label;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      data-testid="ScheduleWebhookCustomFields"
    >
      <div>
        <Label htmlFor="signatureHeader">
          {SCHEDULE_WEBHOOK_COPY.customSignatureHeaderLabel}
        </Label>
        <Input
          defaultValue={trigger?.signatureHeader ?? ''}
          id="signatureHeader"
          name="signatureHeader"
          placeholder="X-Signature"
          required={true}
        />
      </div>

      <div>
        <Label htmlFor="signatureEncoding">
          {SCHEDULE_WEBHOOK_COPY.customEncodingLabel}
        </Label>
        <Select defaultValue={selectedEncoding} name="signatureEncoding">
          <SelectTrigger
            aria-label={SCHEDULE_WEBHOOK_COPY.customEncodingLabel}
            id="signatureEncoding"
          >
            <SelectValue>{encodingLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {WEBHOOK_ENCODING_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="timestampHeader">
          {SCHEDULE_WEBHOOK_COPY.customTimestampHeaderLabel}
        </Label>
        <Input
          defaultValue={trigger?.timestampHeader ?? ''}
          id="timestampHeader"
          name="timestampHeader"
          placeholder="X-Timestamp"
        />
        <p className="text-muted-foreground mt-1 text-xs">
          {SCHEDULE_WEBHOOK_COPY.customTimestampHeaderHelp}
        </p>
      </div>

      <div>
        <Label htmlFor="deliveryIdHeader">
          {SCHEDULE_WEBHOOK_COPY.customDeliveryIdHeaderLabel}
        </Label>
        <Input
          defaultValue={trigger?.deliveryIdHeader ?? ''}
          id="deliveryIdHeader"
          name="deliveryIdHeader"
          placeholder="X-Delivery-Id"
        />
        <p className="text-muted-foreground mt-1 text-xs">
          {SCHEDULE_WEBHOOK_COPY.customDeliveryIdHeaderHelp}
        </p>
      </div>
    </div>
  );
};
