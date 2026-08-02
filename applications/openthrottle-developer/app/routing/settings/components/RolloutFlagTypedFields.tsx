import * as React from 'react';
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
import type { RolloutFlagFieldsFragment } from '~/__generated__/graphql';
import { RolloutFlagKind } from '~/__generated__/graphql';
import { RolloutFlagAllocationEditor } from '~/routing/settings/components/RolloutFlagAllocationEditor';
import { RolloutFlagVariationsEditor } from '~/routing/settings/components/RolloutFlagVariationsEditor';
import { ROLLOUT_COPY } from '~/routing/settings/data/data.copy';
import {
  isRolloutFlagKind,
  ROLLOUT_FLAG_KINDS,
} from '~/routing/settings/data/data.rollout-kinds';
import type { RolloutFormTypedConfig } from '~/routing/settings/utils/rollout-typed-config';
import {
  defaultTypedConfigForKind,
  formatRolloutVariationLabel,
  typedConfigFromFlag,
} from '~/routing/settings/utils/rollout-typed-config';

export interface RolloutFlagTypedFieldsProps {
  flag?: Pick<
    RolloutFlagFieldsFragment,
    'fallthrough' | 'kind' | 'offVariation' | 'variations'
  >;
  idPrefix: string;
}

/**
 * @description Controlled type / variations / fallthrough / off-variation
 * fields for rollout create & edit forms. Submits via hidden JSON inputs.
 */
export const RolloutFlagTypedFields = (
  props: RolloutFlagTypedFieldsProps,
): React.ReactElement => {
  const { flag, idPrefix } = props;

  // Hooks
  const [config, setConfig] = React.useState<RolloutFormTypedConfig>(() =>
    flag
      ? typedConfigFromFlag(flag)
      : defaultTypedConfigForKind(RolloutFlagKind.Boolean),
  );

  // Setup
  const variationLabels = config.variations.map((variation, index) =>
    formatRolloutVariationLabel(variation, index),
  );

  // Handlers
  const handleKindChange = (value: string): void => {
    if (!isRolloutFlagKind(value)) return;
    setConfig(defaultTypedConfigForKind(value));
  };

  const handleVariationsChange = (
    variations: RolloutFormTypedConfig['variations'],
  ): void => {
    setConfig((prev) => {
      const weightByIndex = new Map(
        prev.fallthrough.variations.map((bucket) => [
          bucket.variation,
          bucket.weight,
        ]),
      );
      const fallthrough = {
        variations: variations.map((_, index) => ({
          variation: index,
          weight: weightByIndex.get(index) ?? 0,
        })),
      };
      const offVariation = Math.min(
        prev.offVariation,
        Math.max(0, variations.length - 1),
      );
      return { ...prev, fallthrough, offVariation, variations };
    });
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="space-y-6" data-testid="RolloutFlagTypedFields">
      <input name="kind" type="hidden" value={config.kind} />
      <input name="offVariation" type="hidden" value={config.offVariation} />
      <input
        name="variationsJson"
        type="hidden"
        value={JSON.stringify(config.variations)}
      />
      <input
        name="fallthroughJson"
        type="hidden"
        value={JSON.stringify(config.fallthrough)}
      />

      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-kind`}>{ROLLOUT_COPY.kindLabel}</Label>
        <Select onValueChange={handleKindChange} value={config.kind}>
          <SelectTrigger
            aria-label={ROLLOUT_COPY.kindLabel}
            id={`${idPrefix}-kind`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLLOUT_FLAG_KINDS.map((kind) => (
              <SelectItem key={kind} value={kind}>
                {kind}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">{ROLLOUT_COPY.kindHelp}</p>
      </div>

      <RolloutFlagVariationsEditor
        idPrefix={idPrefix}
        kind={config.kind}
        onChange={handleVariationsChange}
        variations={config.variations}
      />

      <RolloutFlagAllocationEditor
        idPrefix={idPrefix}
        offVariation={config.offVariation}
        onFallthroughChange={(buckets) =>
          setConfig((prev) => ({
            ...prev,
            fallthrough: { variations: buckets },
          }))
        }
        onOffVariationChange={(index) =>
          setConfig((prev) => ({ ...prev, offVariation: index }))
        }
        variationLabels={variationLabels}
        weights={config.fallthrough.variations}
      />
    </div>
  );
};
