import * as React from 'react';
import type { ChatModelOption } from '@openthrottle/react-router-chat';
import type { SkillArgument } from '@openthrottle/openthrottle-skills';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { Mock } from 'vitest';
import { SKILL_RUN_COPY } from '~/routing/skills/data/data.copy';
import { RunSkillDialog } from '../RunSkillDialog';
import type { RunSkillDialogProps, RunSkillPayload } from '../RunSkillDialog';

type RunHandler = Mock<(payload: RunSkillPayload) => void>;

// A local OpenAI-compatible endpoint option (`<baseUrl>::<model>`): no repository
// required, so Run is enabled as soon as it is the selected (first) model.
const OPENAI_MODEL: ChatModelOption = {
  groupId: 'openai:localhost',
  id: 'http://localhost:1234/v1::gpt-4o',
  label: 'gpt-4o',
};

// A bare agent-CLI backend: requires a repository, so Run stays disabled until a
// checkout is selected.
const CLI_MODEL: ChatModelOption = {
  groupId: 'cursor',
  id: 'cursor',
  label: 'Cursor',
};

const renderDialog = (
  overrides: Partial<RunSkillDialogProps> = {},
): {
  component: RenderResult;
  onRun: RunHandler;
} => {
  const onRun: RunHandler = vi.fn();
  const props: RunSkillDialogProps = {
    models: [OPENAI_MODEL],
    onOpenChange: vi.fn(),
    onRun,
    open: true,
    repositories: [],
    slug: 'ot-plans',
    ...overrides,
  };
  const Wrapped = (): React.ReactElement => (
    <TooltipProvider>
      <RunSkillDialog {...props} />
    </TooltipProvider>
  );
  const RoutesStub = createRoutesStub([{ Component: Wrapped, path: '/' }]);

  return { component: render(<RoutesStub />), onRun };
};

const lastPayload = (onRun: RunHandler): RunSkillPayload =>
  onRun.mock.calls[0][0];

const arg = (overrides: Partial<SkillArgument>): SkillArgument => ({
  default: undefined,
  description: undefined,
  enum: undefined,
  name: 'value',
  required: false,
  type: 'text',
  ...overrides,
});

// Mixed-type declarations exercising every control kind. `level` seeds its
// `low` default so the enum value is set without driving the Radix Select
// (unreliable pointer semantics in jsdom).
const ARG_DECLS: readonly SkillArgument[] = [
  arg({ description: 'The target', name: 'target', required: true }),
  arg({ name: 'count', type: 'number' }),
  arg({ name: 'dry-run', type: 'boolean' }),
  arg({ default: 'low', enum: ['low', 'high'], name: 'level', type: 'enum' }),
];

describe('RunSkillDialog Component', () => {
  // The picker selection persists in a localStorage-backed atom; reset it so
  // each test starts from the loader-seeded default (models[0]).
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('renders the model picker and the arguments field', () => {
    const { component } = renderDialog();

    expect(component.getByTestId('RunSkillDialog')).toBeInTheDocument();
    expect(
      component.getByLabelText(SKILL_RUN_COPY.argumentsLabel),
    ).toBeInTheDocument();
  });

  test('disables Run when there are no models', () => {
    const { component } = renderDialog({ models: [] });

    expect(
      component.getByText(SKILL_RUN_COPY.noModelsNotice),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: SKILL_RUN_COPY.runLabel }),
    ).toBeDisabled();
  });

  test('disables Run for a CLI backend until a repository is selected', () => {
    const { component } = renderDialog({
      models: [CLI_MODEL],
      repositories: [],
    });

    // The repository picker is shown only for CLI backends.
    expect(
      component.getByText(SKILL_RUN_COPY.repositoryLabel),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: SKILL_RUN_COPY.runLabel }),
    ).toBeDisabled();
  });

  test('enables Run for an openai model and composes `/<slug>` with no args', async () => {
    const user = userEvent.setup();
    const { component, onRun } = renderDialog({ models: [OPENAI_MODEL] });

    const run = component.getByRole('button', {
      name: SKILL_RUN_COPY.runLabel,
    });
    expect(run).toBeEnabled();

    await user.click(run);

    expect(onRun).toHaveBeenCalledTimes(1);
    const payload = lastPayload(onRun);
    expect(payload.message).toBe('/ot-plans');
    expect(payload.fields.backend).toBe('openai');
    expect(payload.fields.modelId).toBe('gpt-4o');
    expect(payload.fields.baseUrl).toBe('http://localhost:1234/v1');
  });

  test('composes `/<slug> <args>` from the arguments field', async () => {
    const user = userEvent.setup();
    const { component, onRun } = renderDialog({ models: [OPENAI_MODEL] });

    await user.type(
      component.getByLabelText(SKILL_RUN_COPY.argumentsLabel),
      'deploy now',
    );
    await user.click(
      component.getByRole('button', { name: SKILL_RUN_COPY.runLabel }),
    );

    expect(lastPayload(onRun).message).toBe('/ot-plans deploy now');
  });

  test('renders one control per declared argument and hides the free-text field', () => {
    const { component } = renderDialog({ argumentDeclarations: ARG_DECLS });

    expect(component.getByTestId('run-skill-arg-target')).toBeInTheDocument();
    expect(component.getByTestId('run-skill-arg-count')).toBeInTheDocument();
    expect(component.getByTestId('run-skill-arg-dry-run')).toBeInTheDocument();
    expect(component.getByTestId('run-skill-arg-level')).toBeInTheDocument();
    expect(
      component.queryByLabelText(SKILL_RUN_COPY.argumentsLabel),
    ).not.toBeInTheDocument();
  });

  test('gates Run on a required argument until it is filled', async () => {
    const user = userEvent.setup();
    const { component } = renderDialog({ argumentDeclarations: ARG_DECLS });

    const run = component.getByRole('button', {
      name: SKILL_RUN_COPY.runLabel,
    });
    expect(run).toBeDisabled();

    await user.type(
      component.getByLabelText('target', { exact: false }),
      'orders',
    );
    expect(run).toBeEnabled();
  });

  test('composes named flags from structured values (quoting, booleans, enum default)', async () => {
    const user = userEvent.setup();
    const { component, onRun } = renderDialog({
      argumentDeclarations: ARG_DECLS,
    });

    await user.type(
      component.getByLabelText('target', { exact: false }),
      'my target',
    );
    await user.type(component.getByLabelText('count'), '3');
    await user.click(component.getByRole('switch'));
    await user.click(
      component.getByRole('button', { name: SKILL_RUN_COPY.runLabel }),
    );

    expect(lastPayload(onRun).message).toBe(
      '/ot-plans --target "my target" --count 3 --dry-run --level low',
    );
  });

  test('omits empty optional arguments from the composed invocation', async () => {
    const user = userEvent.setup();
    const { component, onRun } = renderDialog({
      argumentDeclarations: [arg({ name: 'note' })],
    });

    await user.click(
      component.getByRole('button', { name: SKILL_RUN_COPY.runLabel }),
    );

    expect(lastPayload(onRun).message).toBe('/ot-plans');
  });
});
