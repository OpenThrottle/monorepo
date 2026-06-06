import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { DialogHeader } from '../DialogHeader';
import type { DialogHeaderProps } from '../DialogHeader';

describe('DialogHeader Component', () => {
  let component: RenderResult;
  let props: DialogHeaderProps;

  beforeEach(() => {
    props = { children: 'Header content' };

    const Component = () => <DialogHeader {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders dialog header content', () => {
    expect(component.getByText('Header content')).toBeInTheDocument();
  });
});
