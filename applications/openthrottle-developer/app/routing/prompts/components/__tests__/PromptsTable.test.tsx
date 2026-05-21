import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PromptsTable } from '../PromptsTable';
import type { PromptsTableProps } from '../PromptsTable';

describe('PromptsTable Component', () => {
  let component: RenderResult;
  let props: PromptsTableProps;

  beforeEach(() => {
    props = { prompts: [] };

    const Component = () => <PromptsTable {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
