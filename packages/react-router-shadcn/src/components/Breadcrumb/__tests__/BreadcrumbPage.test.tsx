import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { BreadcrumbPage } from '../BreadcrumbPage';
import type { BreadcrumbPageProps } from '../BreadcrumbPage';

describe('BreadcrumbPage Component', () => {
  let component: RenderResult;
  let props: BreadcrumbPageProps;

  beforeEach(() => {
    props = {};

    const Component = () => <BreadcrumbPage {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
