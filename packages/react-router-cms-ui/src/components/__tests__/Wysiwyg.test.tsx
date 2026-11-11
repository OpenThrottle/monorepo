import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import type { WysiwygProps } from '../Wysiwyg';
import { Wysiwyg } from '../Wysiwyg';

describe('Wysiwyg Component', () => {
  let component: RenderResult;
  let props: WysiwygProps;

  beforeEach(() => {
    props = {
      className: 'my-20',
      html: '<h3>Title</h3><p>Body <a href="/about">link</a></p>',
    };

    const Component = (): React.ReactElement => {
      return <Wysiwyg {...props} />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders the server-supplied markup as real elements', async () => {
    expect(
      await component.findByRole('heading', { level: 3 }),
    ).toHaveTextContent('Title');
    expect(component.getByRole('link', { name: 'link' })).toHaveAttribute(
      'href',
      '/about',
    );
  });

  test('merges the caller className last', async () => {
    const wrapper = await component.findByTestId('Wysiwyg');

    expect(wrapper).toHaveClass('wysiwyg', 'my-20');
  });
});
