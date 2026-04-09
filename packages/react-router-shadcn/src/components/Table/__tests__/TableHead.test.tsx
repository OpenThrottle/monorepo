import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { TableHead } from '../TableHead';
import type { TableHeadProps } from '../TableHead';

describe('TableHead Component', () => {
  let component: RenderResult;
  let props: TableHeadProps;

  beforeEach(() => {
    props = {};

    const Component = () => <TableHead {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
