import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { Avatar } from '../Avatar';
import type { AvatarProps } from '../Avatar';

describe('Avatar Component', () => {
  let component: RenderResult;
  let props: AvatarProps;

  beforeEach(() => {
    props = {};

    const Component = () => <Avatar {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render avatar root with rounded profile styling', () => {
    const root = component.container.querySelector('span');
    expect(root).toBeInTheDocument();
    expect(root).toHaveClass('rounded-full');
  });
});
