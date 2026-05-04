import * as React from 'react';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanToggleLayout } from '../PlanToggleLayout';
import type { PlanToggleLayoutProps } from '../PlanToggleLayout';
import { renderRoutesStub } from '~/testing/route-fixtures';

describe('PlanToggleLayout Component', () => {
  let component: RenderResult;
  let props: PlanToggleLayoutProps;

  beforeEach(() => {
    props = {};

    component = renderRoutesStub(<PlanToggleLayout {...props} />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
