import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { describe, expect, test, vi } from 'vitest';
import { ChatComposerToolbar } from '../ChatComposerToolbar';
import type { ChatComposerToolbarProps } from '../ChatComposerToolbar';
import {
  ChatComposerMicState,
  ChatComposerMode,
  ChatPermissionMode,
  ChatReasoningLevel,
  ChatServiceTier,
} from '../../types';
import type {
  ChatBackendCapabilities,
  ChatCheckoutOption,
  ChatModelGroup,
  ChatModelOption,
  ChatPersonaOption,
} from '../../types';

const MODELS: readonly ChatModelOption[] = [
  { id: 'opus', label: 'Opus 4.8' },
  { id: 'sonnet', label: 'Sonnet 4.6' },
];

const GROUPED_MODELS: readonly ChatModelOption[] = [
  { groupId: 'claude', id: 'claude::opus', label: 'Opus 4.8' },
  { groupId: 'codex', id: 'codex::gpt5', label: 'GPT-5', subLabel: 'Codex' },
];

const MODEL_GROUPS: readonly ChatModelGroup[] = [
  { id: 'claude', label: 'Claude Code' },
  { id: 'codex', label: 'Codex' },
];

const CLI_CAPS: ChatBackendCapabilities = {
  permissionModes: [
    ChatPermissionMode.supervised,
    ChatPermissionMode.fullAccess,
  ],
  reasoningLevels: [ChatReasoningLevel.low, ChatReasoningLevel.high],
  requiresRepository: true,
  serviceTiers: [ChatServiceTier.standard, ChatServiceTier.fast],
  supportsModelFlag: true,
};

const CHECKOUTS: readonly ChatCheckoutOption[] = [
  { branch: 'main', id: 'repo-a', label: 'openthrottle' },
];

const PERSONAS: readonly ChatPersonaOption[] = [
  { id: 'architect', label: 'Architect' },
  { id: 'builder', label: 'Builder' },
];

const renderToolbar = (props: ChatComposerToolbarProps): RenderResult =>
  render(
    <TooltipProvider>
      <ChatComposerToolbar {...props} />
    </TooltipProvider>,
  );

describe('ChatComposerToolbar Component', () => {
  test('renders an empty bar when no controls are supplied', () => {
    const component = renderToolbar({});

    expect(component.getByTestId('ChatComposerToolbar')).toBeInTheDocument();
    expect(
      component.queryByTestId('ChatComposerToolbar-model-select'),
    ).not.toBeInTheDocument();
  });

  describe('model selector', () => {
    test('renders the selected model from props', () => {
      const component = renderToolbar({ modelId: 'sonnet', models: MODELS });

      const select = component.getByTestId('ChatComposerToolbar-model-select');
      expect(select).toBeInTheDocument();
      expect(select).toHaveTextContent('Sonnet 4.6');
    });

    test('calls onModelChange when a model is selected', async () => {
      const onModelChange = vi.fn();
      const component = renderToolbar({
        modelId: 'opus',
        models: MODELS,
        onModelChange,
      });

      const user = userEvent.setup();
      await user.click(
        component.getByTestId('ChatComposerToolbar-model-select'),
      );
      await user.click(component.getByRole('option', { name: 'Sonnet 4.6' }));

      expect(onModelChange).toHaveBeenCalledWith('sonnet');
    });
  });

  describe('persona selector', () => {
    test('renders the selected persona from props', () => {
      const component = renderToolbar({
        personaId: 'builder',
        personas: PERSONAS,
      });

      const select = component.getByTestId(
        'ChatComposerToolbar-persona-select',
      );
      expect(select).toBeInTheDocument();
      expect(select).toHaveTextContent('Builder');
    });

    test('calls onPersonaChange when a persona is selected', async () => {
      const onPersonaChange = vi.fn();
      const component = renderToolbar({
        onPersonaChange,
        personaId: 'architect',
        personas: PERSONAS,
      });

      const user = userEvent.setup();
      await user.click(
        component.getByTestId('ChatComposerToolbar-persona-select'),
      );
      await user.click(component.getByRole('option', { name: 'Builder' }));

      expect(onPersonaChange).toHaveBeenCalledWith('builder');
    });
  });

  describe('grouped model picker (T3 cluster)', () => {
    test('keeps the flat Select when no modelGroups are supplied', () => {
      const component = renderToolbar({ modelId: 'opus', models: MODELS });

      expect(
        component.getByTestId('ChatComposerToolbar-model-select'),
      ).toBeInTheDocument();
      expect(
        component.queryByTestId('ChatModelPicker-trigger'),
      ).not.toBeInTheDocument();
    });

    test('upgrades to ChatModelPicker when modelGroups are supplied', () => {
      const component = renderToolbar({
        modelGroups: MODEL_GROUPS,
        modelId: 'claude::opus',
        models: GROUPED_MODELS,
      });

      expect(
        component.getByTestId('ChatModelPicker-trigger'),
      ).toBeInTheDocument();
      expect(
        component.queryByTestId('ChatComposerToolbar-model-select'),
      ).not.toBeInTheDocument();
    });
  });

  describe('capability-gated controls', () => {
    test('renders reasoning/tier + permission controls when capabilities are supplied', () => {
      const component = renderToolbar({ capabilities: CLI_CAPS });

      expect(
        component.getByTestId('ChatReasoningTierControl-trigger'),
      ).toBeInTheDocument();
      expect(
        component.getByTestId('ChatPermissionModeControl-trigger'),
      ).toBeInTheDocument();
    });

    test('omits the new controls entirely when no capabilities are supplied', () => {
      const component = renderToolbar({ modelId: 'opus', models: MODELS });

      expect(
        component.queryByTestId('ChatReasoningTierControl-trigger'),
      ).not.toBeInTheDocument();
      expect(
        component.queryByTestId('ChatPermissionModeControl-trigger'),
      ).not.toBeInTheDocument();
      expect(
        component.queryByTestId('ChatCheckoutSelector-trigger'),
      ).not.toBeInTheDocument();
    });

    test('shows the checkout selector when the backend requires a repository', () => {
      const component = renderToolbar({
        capabilities: CLI_CAPS,
        checkouts: CHECKOUTS,
        selectedCheckoutId: 'repo-a',
      });

      expect(
        component.getByTestId('ChatCheckoutSelector-trigger'),
      ).toHaveTextContent('openthrottle');
    });

    test('hides the checkout selector when the backend does not require a repository', () => {
      const component = renderToolbar({
        capabilities: { ...CLI_CAPS, requiresRepository: false },
        checkouts: CHECKOUTS,
      });

      expect(
        component.queryByTestId('ChatCheckoutSelector-trigger'),
      ).not.toBeInTheDocument();
    });

    test('hides the reasoning/tier control when the backend exposes neither', () => {
      const component = renderToolbar({
        capabilities: {
          ...CLI_CAPS,
          reasoningLevels: [],
          serviceTiers: [],
        },
      });

      expect(
        component.queryByTestId('ChatReasoningTierControl-trigger'),
      ).not.toBeInTheDocument();
    });
  });

  describe('mode toggle', () => {
    test('renders Plan and Build when a mode is supplied', () => {
      const component = renderToolbar({ mode: ChatComposerMode.plan });

      expect(
        component.getByTestId('ChatComposerToolbar-mode-toggle'),
      ).toBeInTheDocument();
      expect(
        component.getByTestId('ChatComposerToolbar-mode-plan'),
      ).toHaveTextContent('Plan');
      expect(
        component.getByTestId('ChatComposerToolbar-mode-build'),
      ).toHaveTextContent('Build');
    });

    test('calls onModeChange when the other mode is pressed', async () => {
      const onModeChange = vi.fn();
      const component = renderToolbar({
        mode: ChatComposerMode.plan,
        onModeChange,
      });

      const user = userEvent.setup();
      await user.click(component.getByTestId('ChatComposerToolbar-mode-build'));

      expect(onModeChange).toHaveBeenCalledWith(ChatComposerMode.build);
    });
  });

  describe('attach / add-context control', () => {
    test('calls onAddContext with the chosen source', async () => {
      const onAddContext = vi.fn();
      const component = renderToolbar({
        contextSources: [
          { id: 'file', label: 'File' },
          { id: 'project', label: 'Project' },
        ],
        onAddContext,
      });

      const user = userEvent.setup();
      await user.click(component.getByTestId('ChatComposerToolbar-attach'));
      await user.click(component.getByRole('menuitem', { name: 'Project' }));

      expect(onAddContext).toHaveBeenCalledWith('project');
    });

    test('is disabled when no context sources are supplied', () => {
      const component = renderToolbar({ onAddContext: vi.fn() });

      expect(
        component.getByTestId('ChatComposerToolbar-attach'),
      ).toBeDisabled();
    });

    test('is hidden when no onAddContext callback is supplied', () => {
      const component = renderToolbar({});

      expect(
        component.queryByTestId('ChatComposerToolbar-attach'),
      ).not.toBeInTheDocument();
    });
  });
  describe('mic control', () => {
    test('is hidden when no onMicToggle callback is supplied', () => {
      const component = renderToolbar({});

      expect(
        component.queryByTestId('ChatComposerToolbar-mic'),
      ).not.toBeInTheDocument();
    });

    test('renders idle and calls onMicToggle on click', async () => {
      const onMicToggle = vi.fn();
      const component = renderToolbar({ onMicToggle });

      const mic = component.getByTestId('ChatComposerToolbar-mic');
      expect(mic).toHaveAttribute('aria-label', 'Start voice input');
      expect(mic).toHaveAttribute('aria-pressed', 'false');

      const user = userEvent.setup();
      await user.click(mic);

      expect(onMicToggle).toHaveBeenCalledTimes(1);
    });

    test('reflects the recording state with a pressed, pulsing control', () => {
      const component = renderToolbar({
        micState: ChatComposerMicState.recording,
        onMicToggle: vi.fn(),
      });

      const mic = component.getByTestId('ChatComposerToolbar-mic');
      expect(mic).toHaveAttribute('aria-label', 'Stop voice input');
      expect(mic).toHaveAttribute('aria-pressed', 'true');
      expect(mic).toHaveAttribute('data-mic-state', 'recording');
      expect(mic.querySelector('.animate-pulse')).not.toBeNull();
    });

    test('disables the control while finalizing with a transcribing affordance', () => {
      const component = renderToolbar({
        micState: ChatComposerMicState.finalizing,
        onMicToggle: vi.fn(),
      });

      const mic = component.getByTestId('ChatComposerToolbar-mic');
      expect(mic).toBeDisabled();
      expect(mic).toHaveAttribute('aria-label', 'Transcribing…');
      expect(mic.querySelector('.animate-spin')).not.toBeNull();
    });

    test('disables the control when voice input is unavailable', () => {
      const component = renderToolbar({
        micState: ChatComposerMicState.disabled,
        onMicToggle: vi.fn(),
      });

      const mic = component.getByTestId('ChatComposerToolbar-mic');
      expect(mic).toBeDisabled();
      expect(mic).toHaveAttribute('aria-label', 'Voice input unavailable');
    });
  });
});
