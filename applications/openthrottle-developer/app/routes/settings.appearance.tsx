import * as React from 'react';
import {
  GlobalHeading,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { useAtom } from 'jotai';
import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Input,
  Label,
  ToggleGroup,
  ToggleGroupItem,
} from '@openthrottle/react-router-shadcn';
import {
  ChevronDownIcon,
  MoonIcon,
  SunIcon,
  SwatchBookIcon,
} from 'lucide-react';
import { SITE_TITLE } from '~/global/config/settings';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { getSettingsDiagnosticsLoaderData } from '~/routing/settings/utils/settings-diagnostics-loader-data';
import type { Route } from '@/app/routes/+types/settings.appearance';
import {
  APPEARANCE_BRAND_OVERRIDE_KEYS,
  APPEARANCE_THEME_COLOR_TOKEN_KEYS,
  configAtom,
  DEFAULT_APPEARANCE_CONFIG,
  DEFAULT_BRAND_HSL,
  getBrandColorInputValue,
  type ThemeMode,
} from '~/global/data/atom.config';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Appearance',
  links: (_match) => [{ children: 'Settings', to: '/settings' }],
};

export const loader = (_args: Route.LoaderArgs) => {
  return getSettingsDiagnosticsLoaderData();
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: `SettingsAppearance | ${SITE_TITLE}` }];
};

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;

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

  const handleThemeChange = (value: string) => {
    if (value !== 'light' && value !== 'dark') {
      return;
    }
    setConfig({ ...config, theme: value as ThemeMode });
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  if (!loaderData) {
    return (
      <GlobalScreen>
        <p className="text-sm text-muted-foreground">Loading settings…</p>
      </GlobalScreen>
    );
  }

  return (
    <GlobalScreen>
      <div>
        <GlobalHeading
          className="mb-4"
          heading="h2"
          icon={SwatchBookIcon}
          title="Appearance"
        />
        <p className="mb-4 text-sm text-muted-foreground">
          Theme controls for this portal. Diagnostics below mirror General
          settings and help verify URLs and build metadata.
        </p>

        <div className="space-y-8">
          <section className="space-y-3">
            <Label>Theme</Label>
            <ToggleGroup
              aria-label="Color mode"
              onValueChange={handleThemeChange}
              size="sm"
              type="single"
              value={config.theme}
              variant="outline"
            >
              <ToggleGroupItem
                aria-label="Light mode"
                className="gap-1.5 px-2.5"
                value="light"
              >
                <SunIcon aria-hidden={true} className="size-4" />
                Light
              </ToggleGroupItem>
              <ToggleGroupItem
                aria-label="Dark mode"
                className="gap-1.5 px-2.5"
                value="dark"
              >
                <MoonIcon aria-hidden={true} className="size-4" />
                Dark
              </ToggleGroupItem>
            </ToggleGroup>
            <p className="text-sm text-muted-foreground">
              Default: {DEFAULT_APPEARANCE_CONFIG.theme}
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
            <p className="text-sm text-muted-foreground">
              {isDefaultBrand
                ? `Using theme default (${DEFAULT_BRAND_HSL}). Pick a color to override.`
                : `Custom brand color applied (${config.brand}).`}
            </p>
          </section>

          <section className="space-y-3">
            <Collapsible>
              <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm font-medium hover:bg-muted/50">
                <span>CSS tokens affected by a custom brand</span>
                <ChevronDownIcon
                  aria-hidden={true}
                  className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180"
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-4 text-sm text-muted-foreground">
                <p>
                  A custom brand updates these{' '}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">
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
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">
                    @theme
                  </code>{' '}
                  color tokens that resolve through those variables (for example{' '}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">
                    bg-primary
                  </code>
                  ,{' '}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">
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
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
