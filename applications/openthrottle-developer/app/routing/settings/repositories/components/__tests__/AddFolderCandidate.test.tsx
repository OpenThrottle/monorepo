import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { AddFolderCandidate } from '../AddFolderCandidate';
import type { AddFolderCandidateProps } from '../AddFolderCandidate';
import { WORKSPACE_FOLDERS_COPY } from '~/routing/settings/data/data.copy';

const candidate: AddFolderCandidateProps['candidate'] = {
  alreadyRegistered: false,
  name: 'openthrottle',
  path: '/Users/matt/Development/openthrottle',
};

describe('AddFolderCandidate Component', () => {
  let component: RenderResult;
  let props: AddFolderCandidateProps;

  beforeEach(() => {
    props = { candidate, isAdding: false };
    const RoutesStub = createRoutesStub([
      {
        Component: () => <AddFolderCandidate {...props} />,
        path: '/',
      },
    ]);
    component = render(<RoutesStub />);
  });

  test('renders the folder name and path with an Add submit', () => {
    expect(component.getByText(candidate.name)).toBeTruthy();
    expect(component.getByText(candidate.path)).toBeTruthy();
    expect(component.getByRole('button', { name: 'Add' })).toBeEnabled();
  });

  test('disables the Add submit and shows Adding… while isAdding is true', () => {
    component.unmount();
    props = { candidate, isAdding: true };
    const RoutesStub = createRoutesStub([
      {
        // eslint-disable-next-line react/no-multi-comp
        Component: () => <AddFolderCandidate {...props} />,
        path: '/',
      },
    ]);
    component = render(<RoutesStub />);

    expect(component.getByRole('button', { name: 'Adding…' })).toBeDisabled();
  });

  test('renders an Already added badge instead of the Add form when already registered', () => {
    component.unmount();
    props = {
      candidate: { ...candidate, alreadyRegistered: true },
      isAdding: false,
    };
    const RoutesStub = createRoutesStub([
      {
        // eslint-disable-next-line react/no-multi-comp
        Component: () => <AddFolderCandidate {...props} />,
        path: '/',
      },
    ]);
    component = render(<RoutesStub />);

    expect(
      component.getByText(WORKSPACE_FOLDERS_COPY.alreadyRegisteredBadge),
    ).toBeTruthy();
    expect(component.queryByRole('button', { name: 'Add' })).toBeNull();
  });
});
