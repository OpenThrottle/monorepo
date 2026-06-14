import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { ChatComposerToolbar } from '../ChatComposerToolbar';
import type { ChatComposerToolbarProps } from '../ChatComposerToolbar';

describe('ChatComposerToolbar Component', () => {
  let component: RenderResult;
  let props: ChatComposerToolbarProps;

  beforeEach(() => {
    props = {};

    const Component = () => <ChatComposerToolbar {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render the component name', () => {
    expect(component.getByTestId('ChatComposerToolbar')).toBeInTheDocument();
  });
});
