import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { BreadcrumbList } from '../BreadcrumbList';
import type { BreadcrumbListProps } from '../BreadcrumbList';

describe('BreadcrumbList Component', () => {
  let component: RenderResult;
  let props: BreadcrumbListProps;

  beforeEach(() => {
    props = {};

    const Component = () => <BreadcrumbList {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
