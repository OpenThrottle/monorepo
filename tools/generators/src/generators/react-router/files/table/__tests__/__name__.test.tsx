import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { <%= name %> } from '../<%= name %>';
import type { <%= name %>Props } from '../<%= name %>';

describe('<%= name %> Component', () => {
  let component: RenderResult;
  let props: <%= name %>Props;

  beforeEach(() => {
    props = {
      data: [],
    };

    const Component = () => <<%= name %> {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders table region and column headers', () => {
    expect(component.getByTestId('<%= name %>')).toBeInTheDocument();
    expect(component.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(component.getByRole('columnheader', { name: 'Age' })).toBeInTheDocument();
  });
});
