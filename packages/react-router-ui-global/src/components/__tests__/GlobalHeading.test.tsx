import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { GlobalHeading } from '../GlobalHeading';
import type { GlobalHeadingProps } from '../GlobalHeading';

describe('GlobalHeading Component', () => {
  let component: RenderResult;
  let props: GlobalHeadingProps;

  beforeEach(() => {
    props = {};

    const Component = () => <GlobalHeading {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
