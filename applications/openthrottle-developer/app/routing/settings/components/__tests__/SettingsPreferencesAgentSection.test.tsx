import {
  chatToolbarStateAtom,
  DEFAULT_CHAT_TOOLBAR_STATE,
} from '@openthrottle/react-router-chat-state';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import type { RenderResult } from '@testing-library/react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore, Provider } from 'jotai';
import * as React from 'react';
import type { ActionFunctionArgs } from 'react-router';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import { MOCK_PLAN_RUN_MODELS } from '~/routing/plans/data/mock.plan-run-models';
import { SETTINGS_PREFERENCES_COPY } from '~/routing/settings/data/data.copy';

import type { SettingsPreferencesAgentSectionProps } from '../SettingsPreferencesAgentSection';
import { SettingsPreferencesAgentSection } from '../SettingsPreferencesAgentSection';

describe('SettingsPreferencesAgentSection Component', () => {
  let props: SettingsPreferencesAgentSectionProps;
  let submissions: Record<string, FormDataEntryValue>[];
  let store: ReturnType<typeof createStore>;

  const renderSection = (): RenderResult => {
    const Component = () => {
      return (
        <Provider store={store}>
          <TooltipProvider>
            <SettingsPreferencesAgentSection {...props} />
          </TooltipProvider>
        </Provider>
      );
    };
    const action = async (args: ActionFunctionArgs) => {
      const formData = await args.request.formData();
      submissions.push(Object.fromEntries(formData));
      return { intent: formData.get('intent'), ok: true };
    };
    const RoutesStub = createRoutesStub([{ Component, action, path: '/' }]);

    return render(<RoutesStub />);
  };

  const pickModel = async (
    component: RenderResult,
    backend: string,
    optionId: string,
  ): Promise<void> => {
    const user = userEvent.setup();
    await user.click(component.getByTestId('ChatModelPicker-trigger'));
    await user.click(
      component.getByTestId(`ChatModelPicker-rail-item-${backend}`),
    );
    await user.click(
      component.getByTestId(`ChatModelPicker-option-${backend}-${optionId}`),
    );
  };

  beforeEach(() => {
    submissions = [];
    store = createStore();
    store.set(chatToolbarStateAtom, {
      ...DEFAULT_CHAT_TOOLBAR_STATE,
      modelId: 'cursor|gpt-5.2',
      reasoning: 'low',
    });
    props = { defaultAgent: null, models: MOCK_PLAN_RUN_MODELS };
  });

  describe('when no default is stored', () => {
    test('says the system default is used and cannot save yet', () => {
      const component = renderSection();

      expect(
        component.getByText(SETTINGS_PREFERENCES_COPY.agentSystemDefaultNotice),
      ).toBeInTheDocument();
      expect(
        component.getByRole('button', {
          name: SETTINGS_PREFERENCES_COPY.agentSaveButton,
        }),
      ).toBeDisabled();
    });

    test('offers only agents a plan can run', async () => {
      const user = userEvent.setup();
      const component = renderSection();

      await user.click(component.getByTestId('ChatModelPicker-trigger'));

      expect(
        component.queryByTestId('ChatModelPicker-rail-item-openai:lmstudio'),
      ).not.toBeInTheDocument();
    });
  });

  describe('when saving a picked agent', () => {
    test('posts backend, model and effort, then resets the composer pick', async () => {
      const user = userEvent.setup();
      const component = renderSection();

      await pickModel(component, 'claude', 'claude|opus');
      await user.click(
        component.getByRole('button', {
          name: SETTINGS_PREFERENCES_COPY.agentSaveButton,
        }),
      );

      await waitFor(() => {
        expect(component.getByRole('status')).toHaveTextContent(
          SETTINGS_PREFERENCES_COPY.agentSavedNotice,
        );
      });
      expect(submissions).toEqual([
        {
          backend: 'claude',
          effort: '',
          intent: 'saveDefaultAgent',
          model: 'opus',
        },
      ]);
      // The reset runs in a passive effect after the action result lands, so it can
      // commit after the saved notice renders; wait for it rather than racing it.
      await waitFor(() => {
        expect(store.get(chatToolbarStateAtom).modelId).toBeUndefined();
        expect(store.get(chatToolbarStateAtom).reasoning).toBeUndefined();
      });
    });
  });

  describe('effort', () => {
    test('is offered for a backend with a reasoning knob', async () => {
      const component = renderSection();

      await pickModel(component, 'claude', 'claude|opus');

      expect(
        component.getByTestId('SettingsPreferencesAgentSection-effort'),
      ).toBeInTheDocument();
    });

    test('is hidden for a backend without one', async () => {
      const component = renderSection();

      await pickModel(component, 'cursor', 'cursor|gpt-5.2');

      expect(
        component.queryByTestId('SettingsPreferencesAgentSection-effort'),
      ).not.toBeInTheDocument();
    });
  });

  describe('when a default is stored', () => {
    beforeEach(() => {
      props = {
        ...props,
        defaultAgent: { backend: 'claude', effort: 'high', model: 'opus' },
      };
    });

    test('preselects it', () => {
      const component = renderSection();

      expect(
        component.getByTestId('ChatModelPicker-trigger'),
      ).toHaveTextContent('opus');
    });

    test('clears it back to the system default', async () => {
      const user = userEvent.setup();
      const component = renderSection();

      await user.click(
        component.getByRole('button', {
          name: SETTINGS_PREFERENCES_COPY.agentClearButton,
        }),
      );

      await waitFor(() => {
        expect(submissions).toHaveLength(1);
      });
      expect(submissions[0]?.intent).toBe('clearDefaultAgent');
      await waitFor(() => {
        expect(store.get(chatToolbarStateAtom).modelId).toBeUndefined();
      });
      expect(
        component.getByRole('button', {
          name: SETTINGS_PREFERENCES_COPY.agentSaveButton,
        }),
      ).toBeDisabled();
    });
  });

  describe('when the stored default is no longer available', () => {
    beforeEach(() => {
      props = {
        ...props,
        defaultAgent: { backend: 'claude', effort: null, model: 'retired' },
      };
    });

    test('names it as unavailable instead of hiding it', () => {
      const component = renderSection();

      expect(
        component.getByTestId('SettingsPreferencesAgentSection-stale'),
      ).toHaveTextContent('claude · retired');
      expect(
        component.getByRole('button', {
          name: SETTINGS_PREFERENCES_COPY.agentClearButton,
        }),
      ).toBeEnabled();
    });
  });

  describe('when no agent models were discovered', () => {
    test('points at Settings → Agents', () => {
      props = { ...props, models: [] };
      const component = renderSection();

      expect(
        component.getByTestId('SettingsPreferencesAgentSection-empty'),
      ).toBeInTheDocument();
    });
  });
});
