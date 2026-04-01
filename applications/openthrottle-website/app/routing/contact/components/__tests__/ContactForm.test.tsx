import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { ContactForm } from '../ContactForm';
import type { ContactFormProps } from '../ContactForm';

describe('ContactForm Component', () => {
  let component: RenderResult;
  let props: ContactFormProps;

  beforeEach(() => {
    props = {};

    const Component = () => <ContactForm {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders form with data-testid ContactForm', () => {
    expect(component.getByTestId('ContactForm')).toBeInTheDocument();
  });

  test('renders labeled inputs for email, name, and message', () => {
    expect(component.getByLabelText('Email')).toBeInTheDocument();
    expect(component.getByLabelText('Name')).toBeInTheDocument();
    expect(component.getByLabelText('Message')).toBeInTheDocument();
  });

  test('renders inputs with correct names and types', () => {
    const email = component.getByRole('textbox', { name: 'Email' });
    expect(email).toHaveAttribute('name', 'email');
    expect(email).toHaveAttribute('type', 'email');

    const nameInput = component.getByRole('textbox', { name: 'Name' });
    expect(nameInput).toHaveAttribute('name', 'name');

    const message = component.getByRole('textbox', { name: 'Message' });
    expect(message).toHaveAttribute('name', 'message');
  });

  test('renders submit button', () => {
    expect(
      component.getByRole('button', { name: 'Submit' }),
    ).toBeInTheDocument();
  });

  describe('when actionData contains error', () => {
    beforeEach(() => {
      const errorProps: ContactFormProps = {
        actionData: { error: 'Something went wrong' },
      };
      const Component = () => <ContactForm {...errorProps} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      component = render(<RoutesStub />);
    });

    test('renders error with alert role', () => {
      expect(component.getByRole('alert')).toHaveTextContent(
        'Something went wrong',
      );
    });
  });
});
