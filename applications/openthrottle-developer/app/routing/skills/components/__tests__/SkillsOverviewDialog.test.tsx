import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SkillsOverviewDialog } from '../SkillsOverviewDialog';
import type { SkillsOverviewDialogProps } from '../SkillsOverviewDialog';

describe('SkillsOverviewDialog Component', () => {
  let component: RenderResult;
  let props: SkillsOverviewDialogProps;

  beforeEach(() => {
    props = {};

    const Component = () => <SkillsOverviewDialog {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
