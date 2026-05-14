import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SkillsEmpty } from '../SkillsEmpty';
import type { SkillsEmptyProps } from '../SkillsEmpty';

describe('SkillsEmpty Component', () => {
  let component: RenderResult;
  let props: SkillsEmptyProps;

  beforeEach(() => {
    props = {};

    const Component = () => <SkillsEmpty {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
