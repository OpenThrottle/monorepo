import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { BreadcrumbLink } from '../BreadcrumbLink';
import type { BreadcrumbLinkProps } from '../BreadcrumbLink';

describe('BreadcrumbLink Component', () => {
  let component: RenderResult;
  let props: BreadcrumbLinkProps;

  beforeEach(() => {
    props = {};

    const Component = () => <BreadcrumbLink {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
