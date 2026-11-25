import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';

import { PROJECT_DELETE_COPY } from '~/routing/projects/data/copy';

import { ProjectDeleteZone } from '../ProjectDeleteZone';

const renderZone = () => {
  const intents: Array<FormDataEntryValue | null> = [];
  const action = vi.fn(async ({ request }: { request: Request }) => {
    intents.push((await request.formData()).get('intent'));
    return null;
  });
  const Component = () => {
    return <ProjectDeleteZone projectName="Atlas" />;
  };
  const RoutesStub = createRoutesStub([{ Component, action, path: '/' }]);

  return { component: render(<RoutesStub />), intents };
};

describe('ProjectDeleteZone Component', () => {
  test('asks for confirmation before posting anything', async () => {
    const user = userEvent.setup();
    const { component, intents } = renderZone();

    await user.click(
      component.getByRole('button', { name: PROJECT_DELETE_COPY.trigger }),
    );

    expect(
      await component.findByRole('alertdialog', { name: 'Delete Atlas?' }),
    ).toBeInTheDocument();
    expect(intents).toEqual([]);
  });

  test('cancelling keeps the project', async () => {
    const user = userEvent.setup();
    const { component, intents } = renderZone();

    await user.click(
      component.getByRole('button', { name: PROJECT_DELETE_COPY.trigger }),
    );
    await user.click(
      await component.findByRole('button', {
        name: PROJECT_DELETE_COPY.cancel,
      }),
    );

    await waitFor(() => {
      expect(component.queryByRole('alertdialog')).toBeNull();
    });
    expect(intents).toEqual([]);
  });

  test('confirming posts the deleteProject intent', async () => {
    const user = userEvent.setup();
    const { component, intents } = renderZone();

    await user.click(
      component.getByRole('button', { name: PROJECT_DELETE_COPY.trigger }),
    );
    const dialog = await component.findByRole('alertdialog');
    const confirm = Array.from(dialog.querySelectorAll('button')).find(
      (button) => button.textContent === PROJECT_DELETE_COPY.confirm,
    );
    if (!confirm) throw new Error('expected a confirm button');
    await user.click(confirm);

    await waitFor(() => {
      expect(intents).toEqual(['deleteProject']);
    });
  });
});
