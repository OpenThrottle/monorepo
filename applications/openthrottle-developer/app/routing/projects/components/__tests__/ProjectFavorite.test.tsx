import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';

import type { ProjectFavoriteProps } from '../ProjectFavorite';
import { ProjectFavorite } from '../ProjectFavorite';

interface Submission {
  readonly favorite: FormDataEntryValue | null;
  readonly intent: FormDataEntryValue | null;
  readonly projectId: FormDataEntryValue | null;
}

const renderFavorite = (props: ProjectFavoriteProps) => {
  const submissions: Submission[] = [];
  const action = vi.fn(async ({ request }: { request: Request }) => {
    const formData = await request.formData();
    submissions.push({
      favorite: formData.get('favorite'),
      intent: formData.get('intent'),
      projectId: formData.get('projectId'),
    });
    return null;
  });
  const Component = () => {
    return <ProjectFavorite {...props} />;
  };
  const RoutesStub = createRoutesStub([{ Component, action, path: '/' }]);
  const component = render(<RoutesStub />);
  return { component, submissions };
};

describe('ProjectFavorite', () => {
  describe('when the project is not starred', () => {
    test('is not pressed and posts favorite=true on click', async () => {
      const { component, submissions } = renderFavorite({
        favorite: false,
        projectId: 'proj-1',
        projectName: 'Alpha',
      });
      const button = component.getByRole('button');
      expect(button).toHaveAttribute('aria-pressed', 'false');

      await userEvent.click(button);

      await vi.waitFor(() => {
        expect(submissions).toEqual([
          {
            favorite: 'true',
            intent: 'setProjectFavorite',
            projectId: 'proj-1',
          },
        ]);
      });
    });
  });

  describe('when the project is starred', () => {
    test('is pressed and posts favorite=false on click', async () => {
      const { component, submissions } = renderFavorite({
        favorite: true,
        projectId: 'proj-1',
        projectName: 'Alpha',
      });
      const button = component.getByRole('button');
      expect(button).toHaveAttribute('aria-pressed', 'true');

      await userEvent.click(button);

      await vi.waitFor(() => {
        expect(submissions).toEqual([
          {
            favorite: 'false',
            intent: 'setProjectFavorite',
            projectId: 'proj-1',
          },
        ]);
      });
    });
  });
});
