import type { RenderResult } from '@testing-library/react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import { PROJECT_REPOSITORIES_COPY } from '~/routing/projects/data/data.copy';

import type { ProjectRepositoriesProps } from '../ProjectRepositories';
import { ProjectRepositories } from '../ProjectRepositories';

const repo = (
  id: string,
  name: string,
): ProjectRepositoriesProps['linked'][number] => {
  return {
    __typename: 'RepositoryObject',
    defaultBranch: 'main',
    id,
    name,
    normalizedRemoteUrl: `https://github.com/acme/${name}`,
  };
};

describe('ProjectRepositories Component', () => {
  let component: RenderResult;
  let props: ProjectRepositoriesProps;
  let submitted: Record<string, FormDataEntryValue | null>[];

  const renderRepositories = (): void => {
    const Component = () => {
      return <ProjectRepositories {...props} />;
    };
    const RoutesStub = createRoutesStub([
      {
        Component,
        action: async ({ request }: { request: Request }) => {
          const formData = await request.formData();
          submitted.push({
            intent: formData.get('intent'),
            repositoryId: formData.get('repositoryId'),
          });
          return {};
        },
        path: '/',
      },
    ]);
    component = render(<RoutesStub />);
  };

  beforeEach(() => {
    submitted = [];
    props = {
      available: [repo('repo-2', 'web')],
      linked: [repo('repo-1', 'api')],
    };
  });

  describe('with linked repositories', () => {
    beforeEach(() => {
      renderRepositories();
    });

    test('lists each linked repository', () => {
      expect(component.getAllByRole('listitem')).toHaveLength(1);
      expect(component.getByText('api')).toBeInTheDocument();
    });

    test('links the selected repository', async () => {
      const user = userEvent.setup();
      await user.selectOptions(
        component.getByRole('combobox', {
          name: PROJECT_REPOSITORIES_COPY.addLabel,
        }),
        'repo-2',
      );
      await user.click(
        component.getByRole('button', {
          name: PROJECT_REPOSITORIES_COPY.addButton,
        }),
      );
      await waitFor(() => expect(submitted).toHaveLength(1));
      expect(submitted[0]).toEqual({
        intent: 'linkProjectRepository',
        repositoryId: 'repo-2',
      });
    });

    test('unlinks a repository from its row actions', async () => {
      const user = userEvent.setup();
      await user.click(
        component.getByRole('button', {
          name: `${PROJECT_REPOSITORIES_COPY.menuAriaLabelPrefix} api`,
        }),
      );
      await user.click(
        await component.findByRole('menuitem', {
          name: PROJECT_REPOSITORIES_COPY.unlink,
        }),
      );
      await waitFor(() => expect(submitted).toHaveLength(1));
      expect(submitted[0]).toMatchObject({
        intent: 'unlinkProjectRepository',
        repositoryId: 'repo-1',
      });
    });
  });

  describe('without linked repositories', () => {
    test('renders no list and keeps Link disabled', () => {
      props = { available: [], linked: [] };
      renderRepositories();
      expect(component.queryByRole('list')).not.toBeInTheDocument();
      expect(
        component.getByRole('button', {
          name: PROJECT_REPOSITORIES_COPY.addButton,
        }),
      ).toBeDisabled();
    });
  });
});
