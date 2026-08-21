import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanForm } from '../PlanForm';
import type { PlanFormProps } from '../PlanForm';

/** Props the harness renders; reassigned per test to keep one component/file. */
let props: PlanFormProps = {};

const PlanFormHarness = (): React.ReactElement => <PlanForm {...props} />;

const renderForm = (
  routeProps: Partial<Parameters<typeof createRoutesStub>[0][number]> = {},
): RenderResult => {
  const RoutesStub = createRoutesStub([
    { Component: PlanFormHarness, path: '/', ...routeProps },
  ]);

  return render(<RoutesStub />);
};

describe('PlanForm Component', () => {
  let component: RenderResult;

  beforeEach(() => {
    props = {};
    component = renderForm();
  });

  test('should render create form with title field and submit', () => {
    expect(component.getByTestId('PlanForm')).toBeInTheDocument();
    expect(component.getByLabelText('Title')).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: /create plan/i }),
    ).toBeInTheDocument();
  });

  test('should label the category placeholder as a category, not a permission', () => {
    expect(component.getByText('Select a category…')).toBeInTheDocument();
    expect(component.queryByText('Add permission…')).not.toBeInTheDocument();
  });
});

describe('PlanForm validation feedback', () => {
  beforeEach(() => {
    props = {};
  });

  test('should render a field-anchored error for the offending control', () => {
    props = {
      actionData: {
        error: 'Category is required.',
        field: 'category',
        values: { title: 'My plan' },
      },
    };

    const component = renderForm();
    const message = component.getByTestId('PlanFormError-category');

    expect(message).toHaveTextContent('Category is required.');
    expect(message).toHaveAttribute('role', 'alert');
    expect(component.getByLabelText('Category')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  test('should render an unattributed error as a form-level message', () => {
    props = { actionData: { error: 'Failed to create plan.', values: {} } };

    expect(renderForm().getByTestId('PlanFormError')).toHaveTextContent(
      'Failed to create plan.',
    );
  });

  test('should preserve submitted values across a failed submit', () => {
    props = {
      actionData: {
        error: 'author is required when GITHUB_USER is not set.',
        field: 'author',
        values: {
          category: 'feature',
          summary: 'Short summary text',
          title: 'My plan',
        },
      },
    };

    const component = renderForm();

    expect(component.getByLabelText('Title')).toHaveValue('My plan');
    expect(component.getByLabelText(/Summary/)).toHaveValue(
      'Short summary text',
    );
    expect(component.getByTestId('PlanFormError-author')).toHaveTextContent(
      'author is required when GITHUB_USER is not set.',
    );
    expect(component.getByLabelText('Category')).toHaveTextContent('feature');
  });

  test('should submit with an empty category so the action can report it', async () => {
    const submitted: Array<Record<string, string>> = [];
    const user = userEvent.setup();

    const component = renderForm({
      action: async ({ request }) => {
        const formData = await request.formData();

        submitted.push({
          category: String(formData.get('category')),
          title: String(formData.get('title')),
        });

        return { error: 'Category is required.', field: 'category' };
      },
    });

    await user.type(component.getByLabelText('Title'), 'My plan');
    await user.click(component.getByRole('button', { name: /create plan/i }));

    expect(submitted).toEqual([{ category: '', title: 'My plan' }]);
  });
});
