import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import type { ProjectRepositoryRowFragment } from '~/__generated__/graphql';
import { PROJECT_FORM_COPY } from '~/routing/projects/data/copy';

import type { ProjectFormProps } from '../ProjectForm';
import { ProjectForm } from '../ProjectForm';

const repositories: ProjectRepositoryRowFragment[] = [
  {
    __typename: 'RepositoryObject',
    defaultBranch: 'main',
    id: 'repo-1',
    name: 'OpenThrottle/monorepo',
    normalizedRemoteUrl: 'https://github.com/OpenThrottle/monorepo',
  },
  {
    __typename: 'RepositoryObject',
    defaultBranch: 'main',
    id: 'repo-2',
    name: 'OpenThrottle/website',
    normalizedRemoteUrl: null,
  },
];

const renderForm = (props: ProjectFormProps) => {
  const Component = () => {
    return <ProjectForm {...props} />;
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('ProjectForm Component', () => {
  describe('without repositories', () => {
    test('renders name, description and create actions only', () => {
      const component = renderForm({ repositories: undefined });

      expect(component.getByTestId('ProjectForm')).toBeInTheDocument();
      expect(
        component.getByLabelText(PROJECT_FORM_COPY.nameLabel),
      ).toBeRequired();
      expect(
        component.getByLabelText(PROJECT_FORM_COPY.descriptionLabel),
      ).toBeInTheDocument();
      expect(component.queryByRole('textbox', { name: /nx/i })).toBeNull();
      expect(
        component.queryByRole('button', {
          name: PROJECT_FORM_COPY.repositoriesPlaceholder,
        }),
      ).toBeNull();
      expect(
        component.getByRole('button', { name: PROJECT_FORM_COPY.createSubmit }),
      ).toBeInTheDocument();
      expect(
        component.getByRole('link', { name: PROJECT_FORM_COPY.cancel }),
      ).toHaveAttribute('href', '/projects');
    });

    test('renders the action error', () => {
      const component = renderForm({
        actionData: { error: PROJECT_FORM_COPY.nameMissing },
        repositories: undefined,
      });

      expect(component.getByRole('alert')).toHaveTextContent(
        PROJECT_FORM_COPY.nameMissing,
      );
    });
  });

  describe('with repositories', () => {
    test('posts each selected repository as a hidden repositoryIds field', async () => {
      const user = userEvent.setup();
      const component = renderForm({ repositories });

      await user.click(
        component.getByRole('button', {
          name: PROJECT_FORM_COPY.repositoriesPlaceholder,
        }),
      );
      await user.click(await component.findByText('OpenThrottle/monorepo'));
      await user.click(component.getByText('OpenThrottle/website'));

      const form = component.getByTestId('ProjectForm').querySelector('form');
      if (!form) throw new Error('expected a form');
      const posted = new FormData(form).getAll('repositoryIds');

      expect(posted).toEqual(['repo-1', 'repo-2']);
    });
  });
});
