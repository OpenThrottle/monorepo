import type { RenderResult } from '@testing-library/react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import type { ActionFunctionArgs } from 'react-router';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import { WorkspaceEditorId } from '~/__generated__/graphql';
import { SETTINGS_PREFERENCES_COPY } from '~/routing/settings/data/data.copy';

import type { SettingsPreferencesEditorSectionProps } from '../SettingsPreferencesEditorSection';
import { SettingsPreferencesEditorSection } from '../SettingsPreferencesEditorSection';

describe('SettingsPreferencesEditorSection Component', () => {
  let props: SettingsPreferencesEditorSectionProps;
  let submissions: Record<string, FormDataEntryValue>[];

  const renderSection = (): RenderResult => {
    const Component = () => {
      return <SettingsPreferencesEditorSection {...props} />;
    };
    const action = async (args: ActionFunctionArgs) => {
      const formData = await args.request.formData();
      submissions.push(Object.fromEntries(formData));
      return { intent: formData.get('intent'), ok: true };
    };
    const RoutesStub = createRoutesStub([{ Component, action, path: '/' }]);

    return render(<RoutesStub />);
  };

  const pickEditor = async (
    component: RenderResult,
    label: string,
  ): Promise<void> => {
    const user = userEvent.setup();
    await user.click(
      component.getByRole('combobox', {
        name: SETTINGS_PREFERENCES_COPY.editorLabel,
      }),
    );
    await user.click(component.getByRole('option', { name: label }));
  };

  const save = async (component: RenderResult): Promise<void> => {
    const user = userEvent.setup();
    await user.click(
      component.getByRole('button', {
        name: SETTINGS_PREFERENCES_COPY.editorSaveButton,
      }),
    );
  };

  beforeEach(() => {
    submissions = [];
    props = {
      defaultEditor: null,
      enabledEditors: [WorkspaceEditorId.Vscode, WorkspaceEditorId.Cursor],
    };
  });

  describe('when no default is stored', () => {
    test('shows the system default', () => {
      const component = renderSection();

      expect(
        component.getByRole('combobox', {
          name: SETTINGS_PREFERENCES_COPY.editorLabel,
        }),
      ).toHaveTextContent(SETTINGS_PREFERENCES_COPY.editorSystemDefaultOption);
    });

    test('saves the picked editor', async () => {
      const component = renderSection();

      await pickEditor(component, 'Cursor');
      await save(component);

      await waitFor(() => {
        expect(component.getByRole('status')).toHaveTextContent(
          SETTINGS_PREFERENCES_COPY.editorSavedNotice,
        );
      });
      expect(submissions).toEqual([
        {
          defaultEditor: WorkspaceEditorId.Cursor,
          intent: 'saveDefaultEditor',
        },
      ]);
    });
  });

  describe('when a default is stored', () => {
    beforeEach(() => {
      props = { ...props, defaultEditor: WorkspaceEditorId.Cursor };
    });

    test('clears it by saving the system default', async () => {
      const component = renderSection();

      await pickEditor(
        component,
        SETTINGS_PREFERENCES_COPY.editorSystemDefaultOption,
      );
      await save(component);

      await waitFor(() => {
        expect(submissions).toEqual([
          { defaultEditor: '', intent: 'saveDefaultEditor' },
        ]);
      });
    });
  });

  describe('when the pick is not an enabled editor', () => {
    beforeEach(() => {
      props = { ...props, enabledEditors: [WorkspaceEditorId.Vscode] };
    });

    test('warns and links to Workspace without enabling it', async () => {
      const component = renderSection();

      await pickEditor(component, 'Claude Code');

      const warning = component.getByTestId(
        'SettingsPreferencesEditorSection-not-enabled',
      );
      expect(warning).toHaveTextContent('Claude Code');
      expect(
        component.getByRole('link', {
          name: SETTINGS_PREFERENCES_COPY.editorNotEnabledLink,
        }),
      ).toHaveAttribute('href', '/settings/workspace');
    });

    test('does not warn for an enabled pick', async () => {
      const component = renderSection();

      await pickEditor(component, 'Visual Studio Code');

      expect(
        component.queryByTestId('SettingsPreferencesEditorSection-not-enabled'),
      ).not.toBeInTheDocument();
    });
  });

  describe('when the enabled editors could not be loaded', () => {
    test('makes no claim about the pick', () => {
      props = { defaultEditor: WorkspaceEditorId.Claude, enabledEditors: null };
      const component = renderSection();

      expect(
        component.queryByTestId('SettingsPreferencesEditorSection-not-enabled'),
      ).not.toBeInTheDocument();
    });
  });
});
