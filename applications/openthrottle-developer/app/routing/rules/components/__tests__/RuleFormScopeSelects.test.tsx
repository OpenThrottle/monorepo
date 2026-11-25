import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { RULES_COPY } from '~/routing/rules/data/copy';
import { ANY } from '~/routing/rules/data/rule-form-options';

import type { RuleFormScopeSelectsProps } from '../RuleFormScopeSelects';
import { RuleFormScopeSelects } from '../RuleFormScopeSelects';

describe('RuleFormScopeSelects Component', () => {
  let component: RenderResult;
  let props: RuleFormScopeSelectsProps;

  const hiddenValue = (name: string): string | null => {
    const input = component.container.querySelector(`input[name="${name}"]`);
    return input?.getAttribute('value') ?? null;
  };

  beforeEach(() => {
    props = {
      onProjectChange: vi.fn(),
      onRepositoryChange: vi.fn(),
      projectId: ANY,
      projects: [
        { id: 'project-1', name: 'Platform' },
        { id: 'project-2', name: 'Website' },
      ],
      repositories: [{ id: 'repo-1', name: 'monorepo' }],
      repositoryId: ANY,
    };

    component = render(<RuleFormScopeSelects {...props} />);
  });

  describe('when both scopes are Any', () => {
    test('renders both selects with their labels and hints', () => {
      expect(
        component.getByRole('combobox', { name: RULES_COPY.repositoryLabel }),
      ).toBeInTheDocument();
      expect(
        component.getByRole('combobox', { name: RULES_COPY.projectLabel }),
      ).toBeInTheDocument();
      expect(
        component.getByText(RULES_COPY.projectAnyHint),
      ).toBeInTheDocument();
    });

    test('posts blank hidden inputs', () => {
      expect(hiddenValue('repositoryId')).toBe('');
      expect(hiddenValue('projectId')).toBe('');
    });
  });

  describe('when a project is selected', () => {
    beforeEach(() => {
      component.unmount();
      component = render(
        <RuleFormScopeSelects {...props} projectId="project-2" />,
      );
    });

    test('shows the project name and posts its id', () => {
      expect(
        component.getByRole('combobox', { name: RULES_COPY.projectLabel }),
      ).toHaveTextContent('Website');
      expect(hiddenValue('projectId')).toBe('project-2');
    });
  });

  test('invokes onProjectChange when a project is picked', async () => {
    const user = userEvent.setup();

    await user.click(
      component.getByRole('combobox', { name: RULES_COPY.projectLabel }),
    );
    await user.click(component.getByRole('option', { name: 'Platform' }));

    expect(props.onProjectChange).toHaveBeenCalledWith('project-1');
  });

  test('invokes onRepositoryChange when a repository is picked', async () => {
    const user = userEvent.setup();

    await user.click(
      component.getByRole('combobox', { name: RULES_COPY.repositoryLabel }),
    );
    await user.click(component.getByRole('option', { name: 'monorepo' }));

    expect(props.onRepositoryChange).toHaveBeenCalledWith('repo-1');
  });
});
