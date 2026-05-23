import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { NotesIntroduction } from '../NotesIntroduction';
import type { NotesIntroductionProps } from '../NotesIntroduction';

describe('NotesIntroduction Component', () => {
  let component: RenderResult;
  let props: NotesIntroductionProps;

  beforeEach(() => {
    props = {};

    const Component = () => <NotesIntroduction {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
