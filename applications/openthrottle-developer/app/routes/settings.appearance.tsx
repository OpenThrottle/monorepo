import * as React from 'react';
import {
  GlobalHeading,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { useAtom } from 'jotai';
import { Input, Label } from '@openthrottle/react-router-shadcn';
import { SwatchBookIcon } from 'lucide-react';
import { SITE_TITLE } from '~/global/config/settings';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { getSettingsDiagnosticsLoaderData } from '~/routing/settings/utils/settings-diagnostics-loader-data';
import type { Route } from '@/app/routes/+types/settings.appearance';
import { configAtom } from '~/global/data/atom.config';

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

  // Handlers
  const handleColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({ ...config, accentColor: event.target.value });
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
          <div className="flex items-center gap-2">
            <Label className="whitespace-nowrap">Accent color</Label>
            <div className="aspect-square w-10">
              <Input
                onInput={handleColorChange}
                type="color"
                value={config.accentColor}
              />
            </div>
          </div>
        </div>
      </div>
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
