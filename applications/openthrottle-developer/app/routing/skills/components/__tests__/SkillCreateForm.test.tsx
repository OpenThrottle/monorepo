import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';
import type { SkillCreateDestination } from '~/routing/skills/config/skill-create';
import { SKILL_CREATE_DESTINATIONS } from '~/routing/skills/config/skill-create';
import { SKILL_CREATE_COPY } from '~/routing/skills/data/data.copy';
import type { UseSkillCreateFormResult } from '~/routing/skills/hooks/useSkillCreateForm';
import { SkillCreateForm } from '../SkillCreateForm';

// Monaco cannot boot under jsdom; stand in a textarea with the same controlled
// value/onChange contract, matching how SkillDetailTabs.test.tsx mocks it.
vi.mock('@openthrottle/react-router-editor', () => ({
  EditorWindow: (props: {
    onChange?: (value: string | undefined) => void;
    path?: string;
    value?: string;
  }) => (
    <textarea
      data-path={props.path}
      data-testid="mock-monaco"
      onChange={(event) => props.onChange?.(event.target.value)}
      value={props.value}
    />
  ),
}));

const buildForm = (
  overrides: Partial<UseSkillCreateFormResult> = {},
): UseSkillCreateFormResult => ({
  betaPreviewEnabled: true,
  canSubmit: true,
  content: '---\nname: my-new-skill\n---\n',
  description: 'Does a thing.',
  destination: SKILL_CREATE_DESTINATIONS.personal,
  editorPath: 'my-new-skill/SKILL.md',
  error: undefined,
  handleEditorChange: vi.fn(),
  handleSubmit: vi.fn(),
  isDocumentDirty: false,
  isSubmitting: false,
  setDescription: vi.fn(),
  setDestination: vi.fn(),
  setSlug: vi.fn(),
  setTags: vi.fn(),
  slug: 'my-new-skill',
  slugError: undefined,
  tags: '',
  ...overrides,
});

const renderForm = (
  form: UseSkillCreateFormResult = buildForm(),
  error?: string,
): RenderResult => {
  // eslint-disable-next-line react/no-multi-comp -- test-local harness component
  const Component = () => <SkillCreateForm error={error} form={form} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('SkillCreateForm Component', () => {
  test('renders the form', () => {
    const component = renderForm();

    expect(component.getByTestId('SkillCreateForm')).toBeInTheDocument();
  });

  describe('the metadata fields', () => {
    test('reports the typed name', async () => {
      const user = userEvent.setup();
      const form = buildForm({ slug: '' });
      const component = renderForm(form);

      await user.type(
        component.getByLabelText(SKILL_CREATE_COPY.nameFieldLabel),
        'a',
      );

      expect(form.setSlug).toHaveBeenCalledWith('a');
    });

    test('reports the typed description', async () => {
      const user = userEvent.setup();
      const form = buildForm({ description: '' });
      const component = renderForm(form);

      await user.type(
        component.getByLabelText(SKILL_CREATE_COPY.descriptionFieldLabel),
        'a',
      );

      expect(form.setDescription).toHaveBeenCalledWith('a');
    });

    test('reports the typed tags', async () => {
      const user = userEvent.setup();
      const form = buildForm();
      const component = renderForm(form);

      await user.type(
        component.getByLabelText(SKILL_CREATE_COPY.tagsFieldLabel),
        'a',
      );

      expect(form.setTags).toHaveBeenCalledWith('a');
    });
  });

  describe('slug validation feedback', () => {
    test('shows the field hint while the slug is valid', () => {
      const component = renderForm();

      expect(
        component.getByText(SKILL_CREATE_COPY.nameFieldDescription),
      ).toBeInTheDocument();
    });

    // The complaint arrives before a submit, not only after a server refusal.
    test('shows the complaint inline and marks the field invalid', () => {
      const component = renderForm(
        buildForm({ slugError: 'Use lowercase letters.' }),
      );

      expect(component.getByRole('alert')).toHaveTextContent(
        'Use lowercase letters.',
      );
      expect(
        component.getByLabelText(SKILL_CREATE_COPY.nameFieldLabel),
      ).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('the destination control', () => {
    test('offers both destinations', () => {
      const component = renderForm();

      expect(
        component.getByRole('radio', {
          name: SKILL_CREATE_COPY.destinationPersonalLabel,
        }),
      ).toBeInTheDocument();
      expect(
        component.getByRole('radio', {
          name: SKILL_CREATE_COPY.destinationOpenThrottleLabel,
        }),
      ).toBeInTheDocument();
    });

    test('reports the selected destination', async () => {
      const user = userEvent.setup();
      const form = buildForm();
      const component = renderForm(form);

      await user.click(
        component.getByRole('radio', {
          name: SKILL_CREATE_COPY.destinationOpenThrottleLabel,
        }),
      );

      expect(form.setDestination).toHaveBeenCalledWith(
        SKILL_CREATE_DESTINATIONS.openthrottle,
      );
    });

    test.each<[SkillCreateDestination, string]>([
      [
        SKILL_CREATE_DESTINATIONS.personal,
        SKILL_CREATE_COPY.destinationPersonalDescription,
      ],
      [
        SKILL_CREATE_DESTINATIONS.openthrottle,
        SKILL_CREATE_COPY.destinationOpenThrottleDescription,
      ],
    ])('states the consequence of choosing %s', (destination, consequence) => {
      const component = renderForm(buildForm({ destination }));

      expect(component.getByText(consequence)).toBeInTheDocument();
    });
  });

  describe('the editor', () => {
    test('receives both the path and the value', () => {
      const component = renderForm(
        buildForm({
          content: '# my content',
          editorPath: 'skills/my-new-skill/SKILL.md',
        }),
      );

      const editor = component.getByTestId('mock-monaco');
      expect(editor).toHaveValue('# my content');
      expect(editor).toHaveAttribute(
        'data-path',
        'skills/my-new-skill/SKILL.md',
      );
    });

    test('surfaces the prospective path to the author', () => {
      const component = renderForm(
        buildForm({ editorPath: 'skills/my-new-skill/SKILL.md' }),
      );

      expect(
        component.getByText('skills/my-new-skill/SKILL.md'),
      ).toBeInTheDocument();
    });

    test('reports document edits', async () => {
      const user = userEvent.setup();
      const form = buildForm();
      const component = renderForm(form);

      await user.type(component.getByTestId('mock-monaco'), 'x');

      expect(form.handleEditorChange).toHaveBeenCalled();
    });
  });

  describe('submission', () => {
    test('submits on click', async () => {
      const user = userEvent.setup();
      const form = buildForm();
      const component = renderForm(form);

      await user.click(
        component.getByRole('button', { name: SKILL_CREATE_COPY.submitLabel }),
      );

      expect(form.handleSubmit).toHaveBeenCalledOnce();
    });

    test('disables the submit button while the form is invalid', () => {
      const component = renderForm(buildForm({ canSubmit: false }));

      expect(
        component.getByRole('button', { name: SKILL_CREATE_COPY.submitLabel }),
      ).toBeDisabled();
    });

    test('disables the submit button while in flight', () => {
      const component = renderForm(buildForm({ isSubmitting: true }));

      expect(
        component.getByRole('button', {
          name: SKILL_CREATE_COPY.submittingLabel,
        }),
      ).toBeDisabled();
    });
  });

  describe('server refusals', () => {
    test('renders the inline error', () => {
      const component = renderForm(buildForm(), 'Create rejected — taken.');

      expect(component.getByRole('alert')).toHaveTextContent(
        'Create rejected — taken.',
      );
    });

    test('renders no alert when there is no error', () => {
      const component = renderForm();

      expect(component.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});
