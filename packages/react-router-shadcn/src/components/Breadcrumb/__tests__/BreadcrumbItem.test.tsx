import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { BreadcrumbItem } from '../BreadcrumbItem';
import type { BreadcrumbItemProps } from '../BreadcrumbItem';

describe('BreadcrumbItem Component', () => {
  let component: RenderResult;
  let props: BreadcrumbItemProps;

  beforeEach(() => {
    props = {};

    const Component = () => <BreadcrumbItem {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
