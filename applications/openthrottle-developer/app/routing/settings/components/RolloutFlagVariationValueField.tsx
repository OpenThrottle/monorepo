import * as React from 'react';
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  TextArea,
} from '@openthrottle/react-router-shadcn';
import { RolloutFlagKind } from '~/__generated__/graphql';
import { ROLLOUT_COPY } from '~/routing/settings/data/data.copy';
import type { RolloutFlagKindOption } from '~/routing/settings/data/data.rollout-kinds';
import { encodeVariationValueJson } from '~/routing/settings/utils/rollout-typed-config';

export interface RolloutFlagVariationValueFieldProps {
  editValue: string;
  id: string;
  index: number;
  kind: RolloutFlagKindOption;
  onValueChange: (raw: string) => void;
}

/**
 * @description Kind-aware control for a single variation value (boolean select,
 * number/string input, or JSON textarea with parse validation).
 */
export const RolloutFlagVariationValueField = (
  props: RolloutFlagVariationValueFieldProps,
): React.ReactElement => {
  const { editValue, id, index, kind, onValueChange } = props;

  // Hooks

  // Setup
  const ariaLabel = `${ROLLOUT_COPY.variationValueLabel} ${index}`;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (kind === RolloutFlagKind.Boolean) {
    return (
      <Select
        onValueChange={onValueChange}
        value={editValue === 'true' ? 'true' : 'false'}
      >
        <SelectTrigger aria-label={ariaLabel} id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="false">false</SelectItem>
          <SelectItem value="true">true</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  if (kind === RolloutFlagKind.Json) {
    const encoded = encodeVariationValueJson(kind, editValue);
    const parseError = 'error' in encoded ? encoded.error : null;
    return (
      <div className="space-y-1" data-testid="RolloutFlagVariationValueField">
        <TextArea
          aria-invalid={parseError != null}
          aria-label={ariaLabel}
          id={id}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={ROLLOUT_COPY.variationJsonPlaceholder}
          rows={3}
          value={editValue}
        />
        {parseError ? (
          <p className="text-destructive text-xs" role="alert">
            {parseError}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <Input
      aria-label={ariaLabel}
      data-testid="RolloutFlagVariationValueField"
      id={id}
      onChange={(event) => onValueChange(event.target.value)}
      type={kind === RolloutFlagKind.Number ? 'number' : 'text'}
      value={editValue}
    />
  );
};
