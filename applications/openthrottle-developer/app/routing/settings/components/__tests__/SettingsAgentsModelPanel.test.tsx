import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import type { AgentCliStatus } from '~/routing/settings/data/agent-clis';
import { settingsAgentsModelsShownSummary } from '~/routing/settings/utils/settings-agents-copy';

import { SettingsAgentsModelPanel } from '../SettingsAgentsModelPanel';

const MODEL_IDS = ['gpt-5.2', 'gpt-5.2-fast', 'sonnet-4.5', 'sonnet-4.5-fast'];

const STATUS: AgentCliStatus = {
  driver: 'cursor',
  enabled: true,
  installUrl: 'https://cursor.com/install',
  installed: true,
  label: 'Cursor Agent',
  modelOptions: MODEL_IDS.map((model) => ({
    enabled: model !== 'sonnet-4.5-fast',
    favorite: false,
    model,
  })),
  models: MODEL_IDS,
  version: '1.0.0',
};

const renderPanel = (action: (formData: FormData) => void = () => {}) => {
  const Component = () => {
    return (
      <TooltipProvider>
        <SettingsAgentsModelPanel canManage={true} status={STATUS} />
      </TooltipProvider>
    );
  };
  const RoutesStub = createRoutesStub([
    { Component, path: '/' },
    {
      action: async ({ request }) => {
        action(await request.formData());
        return { driver: 'cursor', enabled: false, errorMessage: null };
      },
      path: '/resources/agent-models-enabled',
    },
    { action: () => ({ ok: true }), path: '/resources/agent-model-enabled' },
    { action: () => ({ ok: true }), path: '/resources/agent-model-favorite' },
  ]);
  return render(<RoutesStub />);
};

const modelToggleId = (model: string): string => {
  return `SettingsAgentsModelToggle-cursor-${model}`;
};

describe('SettingsAgentsModelPanel', () => {
  describe('without a filter', () => {
    test('lists every model and hides the shown count', () => {
      const component = renderPanel();

      for (const model of MODEL_IDS) {
        expect(component.getByTestId(modelToggleId(model))).toBeInTheDocument();
      }
      expect(
        component.queryByTestId('SettingsAgentsModelPanel-cursor-shown'),
      ).not.toBeInTheDocument();
    });
  });

  describe('with a filter', () => {
    test('narrows rows by a case-insensitive substring of the model id', async () => {
      const user = userEvent.setup();
      const component = renderPanel();

      await user.type(
        component.getByTestId('SettingsAgentsModelPanel-cursor-filter'),
        'FAST',
      );

      expect(
        component.getByTestId(modelToggleId('gpt-5.2-fast')),
      ).toBeInTheDocument();
      expect(
        component.getByTestId(modelToggleId('sonnet-4.5-fast')),
      ).toBeInTheDocument();
      expect(
        component.queryByTestId(modelToggleId('gpt-5.2')),
      ).not.toBeInTheDocument();
      expect(
        component.getByTestId('SettingsAgentsModelPanel-cursor-shown'),
      ).toHaveTextContent(
        settingsAgentsModelsShownSummary(2, MODEL_IDS.length),
      );
    });

    test('shows the empty state when nothing matches', async () => {
      const user = userEvent.setup();
      const component = renderPanel();

      await user.type(
        component.getByTestId('SettingsAgentsModelPanel-cursor-filter'),
        'no-such-model',
      );

      expect(
        component.getByTestId('SettingsAgentsModelPanel-cursor-empty'),
      ).toBeInTheDocument();
      expect(
        component.getByTestId('SettingsAgentsModelBulkToggle-cursor-enable'),
      ).toBeDisabled();
    });

    test('bulk disable submits only the filtered models', async () => {
      const user = userEvent.setup();
      const submitted: FormData[] = [];
      const component = renderPanel((formData) => submitted.push(formData));

      await user.type(
        component.getByTestId('SettingsAgentsModelPanel-cursor-filter'),
        'fast',
      );
      await user.click(
        component.getByTestId('SettingsAgentsModelBulkToggle-cursor-disable'),
      );

      expect(submitted).toHaveLength(1);
      expect(submitted[0]?.get('enabled')).toBe('false');
      expect(submitted[0]?.get('models')).toBe(
        JSON.stringify(['gpt-5.2-fast', 'sonnet-4.5-fast']),
      );
    });

    test('clearing the filter restores the full list', async () => {
      const user = userEvent.setup();
      const component = renderPanel();
      const filter = component.getByTestId(
        'SettingsAgentsModelPanel-cursor-filter',
      );

      await user.type(filter, 'sonnet');
      await user.clear(filter);

      for (const model of MODEL_IDS) {
        expect(component.getByTestId(modelToggleId(model))).toBeInTheDocument();
      }
    });
  });
});
