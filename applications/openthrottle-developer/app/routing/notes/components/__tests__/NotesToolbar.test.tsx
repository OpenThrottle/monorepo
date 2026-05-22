import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { NotesToolbar } from '../NotesToolbar';
import type { NotesToolbarProps } from '../NotesToolbar';

describe('NotesToolbar Component', () => {
  let component: RenderResult;
  let props: NotesToolbarProps;

  beforeEach(() => {
    props = {};

    const Component = () => <NotesToolbar {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
