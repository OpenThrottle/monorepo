import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { NotesTable } from '../NotesTable';
import type { NotesTableProps } from '../NotesTable';

describe('NotesTable Component', () => {
  let component: RenderResult;
  let props: NotesTableProps;

  beforeEach(() => {
    props = {};

    const Component = () => <NotesTable {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
