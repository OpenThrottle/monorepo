import * as React from 'react';
import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  THEMES,
} from '@openthrottle/react-router-shadcn';
import { OpenThrottleThemeToggle } from '@openthrottle/react-router-ui';
import { ChevronDownIcon, SwatchBookIcon } from 'lucide-react';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { useAtom } from 'jotai';
import {
  APPEARANCE_BRAND_OVERRIDE_KEYS,
  APPEARANCE_THEME_COLOR_TOKEN_KEYS,
  DEFAULT_BRAND_HSL,
  getBrandColorInputValue,
  type ThemeMode,
} from '@openthrottle/react-router-utils';
import {
  configAtom,
  DEFAULT_APPEARANCE_CONFIG,
} from '~/global/data/atom.config';
import { THEME_DEFAULT_OPTION } from '~/routing/settings/config/appearance';

export interface AppearancePanelProps {}

/**
 * @description Theme, palette, and brand-color controls for Settings → Appearance.
 * Reads/writes the shared appearance `configAtom`. Extracted from the route
 * Component per route-primitive-shape R4 so the route file stays a thin adapter.
 */
export const AppearancePanel = (
  _props: AppearancePanelProps,
): React.ReactElement => {
  // Hooks
  const [config, setConfig] = useAtom(configAtom);

  // Setup
  const brandColorInputValue = getBrandColorInputValue(config.brand);
  const isDefaultBrand = config.brand === undefined;

  // Handlers
  const handleColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({ ...config, brand: event.target.value });
  };

  const handleResetBrand = () => {
    setConfig({ ...config, brand: undefined });
  };

  const handleThemeChange = (theme: ThemeMode) => {
    setConfig({ ...config, theme });
  };

  const handleThemeIdChange = (value: string) => {
    setConfig({
      ...config,
      themeId: value === THEME_DEFAULT_OPTION ? undefined : value,
    });
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div>
      <GlobalHeading
        className="mb-4"
        heading="h2"
        icon={SwatchBookIcon}
        title="Appearance"
      />
      <p className="text-muted-foreground mb-4 text-sm">
        Theme controls for this portal. Diagnostics below mirror General
        settings and help verify URLs and build metadata.
      </p>

      <div className="space-y-8">
        <section className="space-y-3">
          <Label>Theme</Label>
          <OpenThrottleThemeToggle
            onValueChange={handleThemeChange}
            value={config.theme}
          />
          <p className="text-muted-foreground text-sm">
            Default: {DEFAULT_APPEARANCE_CONFIG.theme} — follows your OS color
            scheme until you pick Light or Dark.
          </p>
        </section>

        <section className="space-y-3">
          <Label htmlFor="theme-palette">Theme palette</Label>
          <Select
            onValueChange={handleThemeIdChange}
            value={config.themeId ?? THEME_DEFAULT_OPTION}
          >
            <SelectTrigger className="w-64" id="theme-palette">
              <SelectValue placeholder="Select a palette" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={THEME_DEFAULT_OPTION}>
                System default
              </SelectItem>
              {THEMES.map((theme) => (
                <SelectItem key={theme.id} value={theme.id}>
                  {theme.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-sm">
            Palettes remap the shared design tokens and apply in light, dark,
            and System mode — a palette follows your OS color scheme when the
            theme above is set to System. “System default” (no palette) keeps
            the base theme and your brand color.
          </p>
        </section>

        <section className="space-y-3">
          <Label htmlFor="brand-color">Brand color</Label>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              className="aspect-square h-10 w-10 cursor-pointer p-1"
              id="brand-color"
              onChange={handleColorChange}
              type="color"
              value={brandColorInputValue}
            />
            {!isDefaultBrand ? (
              <Button onClick={handleResetBrand} size="sm" variant="outline">
                Use theme default
              </Button>
            ) : null}
          </div>
          <p className="text-muted-foreground text-sm">
            {isDefaultBrand
              ? `Using theme default (${DEFAULT_BRAND_HSL}). Pick a color to override.`
              : `Custom brand color applied (${config.brand}).`}
          </p>
        </section>

        <section className="space-y-3">
          <Collapsible>
            <CollapsibleTrigger className="group hover:bg-muted/50 flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm font-medium">
              <span>CSS tokens affected by a custom brand</span>
              <ChevronDownIcon
                aria-hidden={true}
                className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180"
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="text-muted-foreground mt-3 space-y-4 text-sm">
              <p>
                A custom brand updates these{' '}
                <code className="bg-muted rounded px-1 py-0.5 text-xs">
                  :root
                </code>{' '}
                variables (injected on refresh by the app shell):
              </p>
              <ul className="list-inside list-disc space-y-1 font-mono text-xs">
                {APPEARANCE_BRAND_OVERRIDE_KEYS.map((token) => (
                  <li key={token}>{token}</li>
                ))}
              </ul>
              <p>
                Tailwind{' '}
                <code className="bg-muted rounded px-1 py-0.5 text-xs">
                  @theme
                </code>{' '}
                color tokens that resolve through those variables (for example{' '}
                <code className="bg-muted rounded px-1 py-0.5 text-xs">
                  bg-primary
                </code>
                ,{' '}
                <code className="bg-muted rounded px-1 py-0.5 text-xs">
                  ring
                </code>
                , sidebar accents):
              </p>
              <ul className="list-inside list-disc space-y-1 font-mono text-xs">
                {APPEARANCE_THEME_COLOR_TOKEN_KEYS.map((token) => (
                  <li key={token}>{token}</li>
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        </section>
      </div>
    </div>
  );
};
