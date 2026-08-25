import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { afterEach, describe, expect, test } from 'vitest';
import { GLOBAL_POPOVER_COPY } from '../../data/data.copy';
import { GlobalPopoverActionsHeader } from '../GlobalPopoverActionsHeader';

describe('GlobalPopoverActionsHeader Component', () => {
  afterEach(() => {
    cleanup();
  });

  test('renders the shared Actions header copy centered', () => {
    const Component = (): React.ReactElement => <GlobalPopoverActionsHeader />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(
      component.getByTestId('GlobalPopoverActionsHeader'),
    ).toBeInTheDocument();
    expect(
      component.getByText(GLOBAL_POPOVER_COPY.actionsHeader),
    ).toBeInTheDocument();
    expect(component.getByTestId('GlobalPopoverActionsHeader')).toHaveClass(
      'text-center',
    );
  });
});
