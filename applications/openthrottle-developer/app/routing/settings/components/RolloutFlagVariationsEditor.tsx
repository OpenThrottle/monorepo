import * as React from 'react';
import { Button, Input, Label } from '@openthrottle/react-router-shadcn';
import { RolloutFlagVariationValueField } from '~/routing/settings/components/RolloutFlagVariationValueField';
import { ROLLOUT_COPY } from '~/routing/settings/data/data.copy';
import type { RolloutFlagKindOption } from '~/routing/settings/data/data.rollout-kinds';
import { RolloutFlagKind } from '~/__generated__/graphql';
import type { RolloutFormVariation } from '~/routing/settings/utils/rollout-typed-config';
import {
  decodeVariationValueForEdit,
  defaultRawValueForKind,
  encodeVariationValueJson,
} from '~/routing/settings/utils/rollout-typed-config';

export interface RolloutFlagVariationsEditorProps {
  idPrefix: string;
  kind: RolloutFlagKindOption;
  onChange: (variations: RolloutFormVariation[]) => void;
  variations: RolloutFormVariation[];
}

/**
 * @description Typed variations editor: add/remove rows with kind-aware value
 * inputs (boolean select, number/string inputs, JSON textarea).
 */
export const RolloutFlagVariationsEditor = (
  props: RolloutFlagVariationsEditorProps,
): React.ReactElement => {
  const { idPrefix, kind, onChange, variations } = props;

  // Hooks

  // Setup
  const canRemove = variations.length > 2;

  // Handlers
  const updateAt = (
    index: number,
    patch: Partial<RolloutFormVariation>,
  ): void => {
    onChange(
      variations.map((variation, i) =>
        i === index ? { ...variation, ...patch } : variation,
      ),
    );
  };

  const handleValueChange = (index: number, raw: string): void => {
    const encoded = encodeVariationValueJson(kind, raw);
    if ('error' in encoded) {
      if (
        kind === RolloutFlagKind.Json ||
        kind === RolloutFlagKind.Number ||
        kind === RolloutFlagKind.String
      ) {
        updateAt(index, {
          valueJson:
            kind === RolloutFlagKind.String ? JSON.stringify(raw) : raw,
        });
      }
      return;
    }
    updateAt(index, { valueJson: encoded.valueJson });
  };

  const handleAdd = (): void => {
    const encoded = encodeVariationValueJson(
      kind,
      defaultRawValueForKind(kind),
    );
    const valueJson = 'valueJson' in encoded ? encoded.valueJson : '""';
    onChange([...variations, { description: '', name: '', valueJson }]);
  };

  const handleRemove = (index: number): void => {
    if (!canRemove) return;
    onChange(variations.filter((_, i) => i !== index));
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="space-y-3" data-testid="RolloutFlagVariationsEditor">
      <div className="space-y-1">
        <p className="text-sm font-medium">{ROLLOUT_COPY.variationsLabel}</p>
        <p className="text-muted-foreground text-xs">
          {ROLLOUT_COPY.variationsHelp}
        </p>
      </div>

      <ul className="space-y-4">
        {variations.map((variation, index) => (
          <li
            className="space-y-2 rounded-md border p-3"
            key={`${idPrefix}-variation-${index}`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-muted-foreground text-xs font-medium">
                {ROLLOUT_COPY.variationIndexPrefix}
                {index}
              </p>
              {canRemove ? (
                <Button
                  onClick={() => handleRemove(index)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  {ROLLOUT_COPY.removeVariationButton}
                </Button>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor={`${idPrefix}-variation-${index}-name`}>
                  {ROLLOUT_COPY.variationNameLabel}
                </Label>
                <Input
                  id={`${idPrefix}-variation-${index}-name`}
                  onChange={(event) =>
                    updateAt(index, { name: event.target.value })
                  }
                  placeholder={ROLLOUT_COPY.variationNamePlaceholder}
                  value={variation.name}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`${idPrefix}-variation-${index}-description`}>
                  {ROLLOUT_COPY.variationDescriptionLabel}
                </Label>
                <Input
                  id={`${idPrefix}-variation-${index}-description`}
                  onChange={(event) =>
                    updateAt(index, { description: event.target.value })
                  }
                  placeholder={ROLLOUT_COPY.variationDescriptionPlaceholder}
                  value={variation.description}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor={`${idPrefix}-variation-${index}-value`}>
                {ROLLOUT_COPY.variationValueLabel}
              </Label>
              <RolloutFlagVariationValueField
                editValue={decodeVariationValueForEdit(
                  kind,
                  variation.valueJson,
                )}
                id={`${idPrefix}-variation-${index}-value`}
                index={index}
                kind={kind}
                onValueChange={(raw) => handleValueChange(index, raw)}
              />
            </div>
          </li>
        ))}
      </ul>

      <Button onClick={handleAdd} size="sm" type="button" variant="outline">
        {ROLLOUT_COPY.addVariationButton}
      </Button>
    </div>
  );
};
