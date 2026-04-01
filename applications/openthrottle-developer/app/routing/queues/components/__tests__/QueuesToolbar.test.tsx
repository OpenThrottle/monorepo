import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { QueuesToolbar } from '../QueuesToolbar';
import type { QueuesToolbarProps } from '../QueuesToolbar';

describe('QueuesToolbar Component', () => {
  let component: RenderResult;
  let props: QueuesToolbarProps;

  beforeEach(() => {
    props = {};

    const Component = () => <QueuesToolbar {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should have Create queue link to /queues/create', () => {
    const link = component.getByRole('link', { name: /create queue/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/queues/create');
  });

  test('should have data-testid QueuesToolbar', () => {
    expect(component.getByTestId('QueuesToolbar')).toBeInTheDocument();
  });
});
