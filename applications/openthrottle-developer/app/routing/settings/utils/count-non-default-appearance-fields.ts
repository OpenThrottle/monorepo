import {
  DEFAULT_APPEARANCE_CONFIG,
  type ConfigObject,
} from '~/global/data/atom.config';

/**
 * @description How many appearance fields differ from
 * {@link DEFAULT_APPEARANCE_CONFIG}. `0` means the reset control has nothing to
 * do; more than one means the reset is worth confirming, since a single click
 * would discard several separate choices.
 */
export const countNonDefaultAppearanceFields = (
  config: ConfigObject,
): number => {
  const comparisons: readonly boolean[] = [
    config.brand !== DEFAULT_APPEARANCE_CONFIG.brand,
    config.reducedMotion !== DEFAULT_APPEARANCE_CONFIG.reducedMotion,
    config.theme !== DEFAULT_APPEARANCE_CONFIG.theme,
    config.themeId !== DEFAULT_APPEARANCE_CONFIG.themeId,
  ];

  return comparisons.filter(Boolean).length;
};
