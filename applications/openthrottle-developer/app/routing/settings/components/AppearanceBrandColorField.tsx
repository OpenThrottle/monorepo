import * as React from 'react';
import { Button, Input, Label } from '@openthrottle/react-router-shadcn';
import { useAtom } from 'jotai';
import {
  DEFAULT_BRAND_HSL,
  getBrandColorInputValue,
} from '@openthrottle/react-router-utils';
import { configAtom } from '~/global/data/atom.config';
import { APPEARANCE_COPY } from '~/routing/settings/data/data.copy';

export interface AppearanceBrandColorFieldProps {}

/**
 * @description Brand-color override for Settings → Appearance. Owns the `brand`
 * slice of the shared appearance `configAtom`; clearing it falls back to the
 * active palette's own brand token.
 */
export const AppearanceBrandColorField = (
  _props: AppearanceBrandColorFieldProps,
): React.ReactElement => {
  // Hooks
  const [config, setConfig] = useAtom(configAtom);

  // Setup
  const brandColorInputValue = getBrandColorInputValue(config.brand);
  const isDefaultBrand = config.brand === undefined;

  // Handlers
  const handleColorChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    setConfig({ ...config, brand: event.target.value });
  };

  const handleResetBrand = (): void => {
    setConfig({ ...config, brand: undefined });
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="space-y-3" data-testid="AppearanceBrandColorField">
      <Label htmlFor="brand-color">{APPEARANCE_COPY.brandLabel}</Label>
      <div className="flex flex-wrap items-center gap-3">
        <Input
          className="aspect-square h-10 w-10 cursor-pointer p-1"
          id="brand-color"
          onChange={handleColorChange}
          type="color"
          value={brandColorInputValue}
        />
        {isDefaultBrand ? null : (
          <Button onClick={handleResetBrand} size="sm" variant="outline">
            {APPEARANCE_COPY.brandResetButton}
          </Button>
        )}
      </div>
      <p className="text-muted-foreground text-sm">
        {isDefaultBrand ? (
          <>
            {APPEARANCE_COPY.brandDefaultHelpPrefix}
            {DEFAULT_BRAND_HSL}
            {APPEARANCE_COPY.brandDefaultHelpSuffix}
          </>
        ) : (
          <>
            {APPEARANCE_COPY.brandCustomHelpPrefix}
            {config.brand}
            {APPEARANCE_COPY.brandCustomHelpSuffix}
          </>
        )}
      </p>
    </div>
  );
};
