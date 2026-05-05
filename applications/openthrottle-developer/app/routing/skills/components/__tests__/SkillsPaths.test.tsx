import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SkillsPaths } from '../SkillsPaths';
import type { SkillsPathsProps } from '../SkillsPaths';

describe('SkillsPaths Component', () => {
  let component: RenderResult;
  let props: SkillsPathsProps;

  beforeEach(() => {
    props = {};

    const Component = () => <SkillsPaths {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
