import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PersonasIntroduction } from '../PersonasIntroduction';
import type { PersonasIntroductionProps } from '../PersonasIntroduction';

describe('PersonasIntroduction Component', () => {
  let component: RenderResult;
  let props: PersonasIntroductionProps;

  beforeEach(() => {
    props = {};

    const Component = () => <PersonasIntroduction {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
