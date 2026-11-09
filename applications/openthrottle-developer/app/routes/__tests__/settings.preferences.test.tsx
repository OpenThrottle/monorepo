import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import type { Route } from '@/app/routes/+types/settings.preferences';
import { WorkspaceEditorId } from '~/__generated__/graphql';
import { MOCK_PLAN_RUN_MODELS } from '~/routing/plans/data/mock.plan-run-models';
import { SETTINGS_PREFERENCES_COPY } from '~/routing/settings/data/data.copy';
import { buildRootMatch } from '~/testing/root-match-fixture';

import Component from '../settings.preferences';

type LoaderData = Route.ComponentProps['loaderData'];

describe('routes/settings.preferences.tsx', () => {
  let loaderData: LoaderData;

  const renderRoute = (): RenderResult => {
    const Page = () => {
      return (
        <TooltipProvider>
          <Component
            actionData={undefined}
            loaderData={loaderData}
            matches={[
              buildRootMatch(),
              {
                handle: undefined,
                id: 'routes/settings.preferences',
                loaderData,
                params: {},
                pathname: '/settings/preferences',
              },
            ]}
            params={{}}
          />
        </TooltipProvider>
      );
    };
    const RoutesStub = createRoutesStub([{ Component: Page, path: '/' }]);

    return render(<RoutesStub />);
  };

  beforeEach(() => {
    loaderData = {
      enabledEditors: [WorkspaceEditorId.Vscode],
      models: [...MOCK_PLAN_RUN_MODELS],
      preferences: {
        defaultAgent: { backend: 'claude', effort: null, model: 'opus' },
        defaultEditor: WorkspaceEditorId.Cursor,
      },
    };
  });

  test('renders the heading and both sections', () => {
    const component = renderRoute();

    expect(
      component.getByRole('heading', { name: SETTINGS_PREFERENCES_COPY.title }),
    ).toBeInTheDocument();
    expect(
      component.getByTestId('SettingsPreferencesEditorSection'),
    ).toBeInTheDocument();
    expect(
      component.getByTestId('SettingsPreferencesAgentSection'),
    ).toBeInTheDocument();
  });

  test('warns that the stored editor is not enabled', () => {
    const component = renderRoute();

    expect(
      component.getByTestId('SettingsPreferencesEditorSection-not-enabled'),
    ).toBeInTheDocument();
  });
});
