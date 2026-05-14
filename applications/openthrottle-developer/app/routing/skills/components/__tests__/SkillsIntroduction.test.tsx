import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SkillsIntroduction } from '../SkillsIntroduction';
import type { SkillsIntroductionProps } from '../SkillsIntroduction';

describe('SkillsIntroduction Component', () => {
  let component: RenderResult;
  let props: SkillsIntroductionProps;

  beforeEach(() => {
    props = {};

    const Component = () => <SkillsIntroduction {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
