/* eslint-disable react/no-multi-comp -- test harness declares small route components inline */
import * as React from 'react';
import { render, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { AddFolderDialog } from '../AddFolderDialog';
import type { AddFolderDialogProps } from '../AddFolderDialog';

describe('AddFolderDialog Component', () => {
  let component: RenderResult;
  let props: AddFolderDialogProps;

  beforeEach(() => {
    props = {
      discoveredFolders: [
        {
          alreadyRegistered: false,
          name: 'openthrottle',
          path: '/Users/dev/Development/openthrottle',
        },
        {
          alreadyRegistered: true,
          name: 'registered-repo',
          path: '/Users/dev/Development/registered-repo',
        },
      ],
      pickerCapabilities: {
        canUseNativeDialog: false,
        defaultBrowsePath: '/Users/dev/Development',
        roots: ['/Users/dev/Development'],
      },
    };

    const Component = () => <AddFolderDialog {...props} />;
    const RoutesStub = createRoutesStub([
      { Component, action: () => ({ ok: true }), path: '/' },
    ]);

    component = render(<RoutesStub />);
  });

  test('opens the dialog and lists discovered folders', async () => {
    const user = userEvent.setup();

    await user.click(component.getByTestId('AddFolderDialogTrigger'));

    expect(component.getByTestId('AddFolderDialog')).toBeInTheDocument();
    expect(component.getByText('openthrottle')).toBeInTheDocument();
    expect(
      component.getByText('/Users/dev/Development/openthrottle'),
    ).toBeInTheDocument();
  });

  test('marks already-registered folders instead of offering Add', async () => {
    const user = userEvent.setup();

    await user.click(component.getByTestId('AddFolderDialogTrigger'));

    expect(component.getByText('Already added')).toBeInTheDocument();
    // Only the unregistered candidate gets an Add button.
    expect(component.getAllByRole('button', { name: 'Add' })).toHaveLength(1);
  });

  test('reveals the manual server-path escape hatch behind a toggle', async () => {
    const user = userEvent.setup();

    await user.click(component.getByTestId('AddFolderDialogTrigger'));
    expect(component.queryByLabelText('Server path')).not.toBeInTheDocument();

    await user.click(component.getByText('Enter a server path manually'));

    expect(component.getByLabelText('Server path')).toBeInTheDocument();
  });
});

const listingAtRoot = {
  entries: [
    {
      alreadyRegistered: false,
      isGitRepo: true,
      name: 'child',
      path: '/root/child',
    },
    {
      alreadyRegistered: true,
      isGitRepo: false,
      name: 'used',
      path: '/root/used',
    },
  ],
  isGitRepo: false,
  parentPath: null,
  path: '/root',
};

const renderPicker = (canUseNativeDialog: boolean): RenderResult => {
  const Component = () => (
    <AddFolderDialog
      discoveredFolders={[]}
      pickerCapabilities={{
        canUseNativeDialog,
        defaultBrowsePath: '/root',
        roots: ['/root'],
      }}
    />
  );
  const action = async ({ request }: { request: Request }) => {
    const formData = await request.formData();
    const intent = formData.get('intent');
    if (intent === 'pickFolderNative') {
      return { picked: { path: '/root/picked' } };
    }
    if (intent === 'browseDirectory') {
      if (formData.get('path') === '/root/child') {
        return {
          browse: {
            entries: [],
            isGitRepo: true,
            parentPath: '/root',
            path: '/root/child',
          },
        };
      }
      return { browse: listingAtRoot };
    }
    return { ok: true };
  };
  const RoutesStub = createRoutesStub([{ Component, action, path: '/' }]);
  return render(<RoutesStub />);
};

describe('AddFolderDialog picker interactions', () => {
  test('native branch: Browse… opens the dialog and confirms the chosen path', async () => {
    const user = userEvent.setup();
    const component = renderPicker(true);

    await user.click(component.getByTestId('AddFolderDialogTrigger'));

    const browseButton = await component.findByRole('button', {
      name: 'Browse…',
    });
    await user.click(browseButton);

    // The mutation-returned path flows into the confirm step.
    expect(await component.findByText('/root/picked')).toBeInTheDocument();
  });

  test('in-app picker lists annotated entries and disables Add on registered ones', async () => {
    const component = renderPicker(false);
    const user = userEvent.setup();

    await user.click(component.getByTestId('AddFolderDialogTrigger'));

    // Seeded from defaultBrowsePath with no typing.
    expect(await component.findByText('child')).toBeInTheDocument();
    expect(component.getByText('used')).toBeInTheDocument();
    // Registered entry shows the badge instead of an Add control.
    expect(component.getByText('Already added')).toBeInTheDocument();
    // Git-repo entry carries a badge.
    expect(component.getAllByText('Git repo').length).toBeGreaterThan(0);
  });

  test('opening an entry navigates into it and shows Add this folder', async () => {
    const component = renderPicker(false);
    const user = userEvent.setup();

    await user.click(component.getByTestId('AddFolderDialogTrigger'));

    // Current directory is addable via "Add this folder".
    expect(await component.findByText('Add this folder')).toBeInTheDocument();

    await user.click(await component.findByText('child'));

    // Breadcrumb reflects the drill-down into /root/child. The nav element
    // already exists at /root, so retry on its content rather than its
    // presence — otherwise this races the browseDirectory action.
    const breadcrumb = component.getByLabelText('Folder breadcrumb');
    await waitFor(() => {
      expect(breadcrumb).toHaveTextContent('child');
    });
  });
});
