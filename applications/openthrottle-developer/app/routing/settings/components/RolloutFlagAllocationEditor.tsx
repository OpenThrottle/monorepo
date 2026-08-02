import * as React from 'react';
import { Input, Label } from '@openthrottle/react-router-shadcn';
import { ROLLOUT_COPY } from '~/routing/settings/data/data.copy';
import type { RolloutFormFallthroughBucket } from '~/routing/settings/utils/rollout-typed-config';
import {
  fallthroughWeightsAreValid,
  sumFallthroughWeights,
} from '~/routing/settings/utils/rollout-typed-config';

export interface RolloutFlagAllocationEditorProps {
  idPrefix: string;
  offVariation: number;
  onFallthroughChange: (buckets: RolloutFormFallthroughBucket[]) => void;
  onOffVariationChange: (index: number) => void;
  variationLabels: readonly string[];
  weights: RolloutFormFallthroughBucket[];
}

/**
 * @description Fallthrough percent weights (must sum to 100) plus off-variation
 * picker for typed rollout flags.
 */
export const RolloutFlagAllocationEditor = (
  props: RolloutFlagAllocationEditorProps,
): React.ReactElement => {
  const {
    idPrefix,
    offVariation,
    onFallthroughChange,
    onOffVariationChange,
    variationLabels,
    weights,
  } = props;

  // Hooks

  // Setup
  const sum = sumFallthroughWeights(weights);
  const valid = fallthroughWeightsAreValid(weights);

  // Handlers
  const handleWeightChange = (variation: number, raw: string): void => {
    const nextWeight = raw.trim() === '' ? 0 : Number(raw);
    if (!Number.isFinite(nextWeight)) return;
    const clamped = Math.max(0, Math.min(100, Math.trunc(nextWeight)));
    const byVariation = new Map(
      weights.map((bucket) => [bucket.variation, bucket.weight] as const),
    );
    byVariation.set(variation, clamped);
    onFallthroughChange(
      variationLabels.map((_, index) => ({
        variation: index,
        weight: byVariation.get(index) ?? 0,
      })),
    );
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="space-y-4" data-testid="RolloutFlagAllocationEditor">
      <div className="space-y-1">
        <p className="text-sm font-medium">{ROLLOUT_COPY.fallthroughLabel}</p>
        <p className="text-muted-foreground text-xs">
          {ROLLOUT_COPY.fallthroughHelp}
        </p>
      </div>

      <ul className="space-y-2">
        {variationLabels.map((label, index) => {
          const bucket = weights.find((entry) => entry.variation === index);
          const weight = bucket?.weight ?? 0;
          return (
            <li
              className="flex flex-wrap items-center gap-3"
              key={`${idPrefix}-weight-${index}`}
            >
              <Label
                className="min-w-[8rem] font-mono text-xs"
                htmlFor={`${idPrefix}-weight-${index}`}
              >
                {label}
              </Label>
              <Input
                aria-label={`${ROLLOUT_COPY.fallthroughWeightLabel} ${label}`}
                className="w-24"
                id={`${idPrefix}-weight-${index}`}
                max={100}
                min={0}
                onChange={(event) =>
                  handleWeightChange(index, event.target.value)
                }
                step={1}
                type="number"
                value={weight}
              />
              <span className="text-muted-foreground text-xs">
                {ROLLOUT_COPY.fallthroughWeightLabel}
              </span>
            </li>
          );
        })}
      </ul>

      <p
        className={
          valid ? 'text-muted-foreground text-xs' : 'text-destructive text-xs'
        }
        role={valid ? undefined : 'alert'}
      >
        {ROLLOUT_COPY.fallthroughSumStatusPrefix}
        {sum}
        {ROLLOUT_COPY.fallthroughSumStatusSuffix}
      </p>

      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-off-variation`}>
          {ROLLOUT_COPY.offVariationLabel}
        </Label>
        <select
          className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
          id={`${idPrefix}-off-variation`}
          name="offVariationSelect"
          onChange={(event) => onOffVariationChange(Number(event.target.value))}
          value={offVariation}
        >
          {variationLabels.map((label, index) => (
            <option key={`${idPrefix}-off-${index}`} value={index}>
              {index}: {label}
            </option>
          ))}
        </select>
        <p className="text-muted-foreground text-xs">
          {ROLLOUT_COPY.offVariationHelp}
        </p>
      </div>
    </div>
  );
};
