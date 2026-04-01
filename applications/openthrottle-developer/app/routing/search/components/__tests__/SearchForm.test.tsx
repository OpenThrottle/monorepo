import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { within } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { SearchForm } from '../SearchForm';
import type { SearchFormProps } from '../SearchForm';

describe('SearchForm Component', () => {
  let component: RenderResult;
  let props: SearchFormProps;

  beforeEach(() => {
    props = {};

    const Component = () => <SearchForm {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should have form with method get and action /search', () => {
    const form = component.getByTestId('SearchForm');
    expect(form).toHaveAttribute('method', 'get');
    expect(form).toHaveAttribute('action', '/search');
    expect(form).toHaveAttribute('role', 'search');
  });

  test('should have query input with name q', () => {
    const input = component.getByRole('searchbox', { name: /search query/i });
    expect(input).toHaveAttribute('name', 'q');
    expect(input).toHaveAttribute('type', 'search');
  });

  test('should pre-fill input when defaultQuery is passed', () => {
    const { container } = render(<SearchForm defaultQuery="my plan" />);
    const input = within(container).getByRole('searchbox');
    expect(input).toHaveValue('my plan');
  });

  test('should have submit button', () => {
    const button = component.getByRole('button', { name: /search/i });
    expect(button).toHaveAttribute('type', 'submit');
  });
});
