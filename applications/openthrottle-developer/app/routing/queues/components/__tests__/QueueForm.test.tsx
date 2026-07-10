import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { QueueForm } from '../QueueForm';
import type { QueueFormProps } from '../QueueForm';

describe('QueueForm Component', () => {
  let component: RenderResult;
  let props: QueueFormProps;

  beforeEach(() => {
    props = {};

    const Component = () => <QueueForm {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders queue name field and submit actions', () => {
    expect(component.getByTestId('QueueForm')).toBeInTheDocument();
    expect(component.getByLabelText(/queue name/i)).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: /create queue/i }),
    ).toBeInTheDocument();
    expect(component.getByRole('link', { name: /cancel/i })).toHaveAttribute(
      'href',
      '/queues',
    );
  });

  describe('when actionData includes an error', () => {
    beforeEach(() => {
      props = { actionData: { error: 'Queue name already exists' } };
      // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
      const Component = () => <QueueForm {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      component.rerender(<RoutesStub />);
    });

    test('shows the error in an alert', () => {
      expect(component.getByRole('alert')).toHaveTextContent(
        'Queue name already exists',
      );
    });
  });
});
