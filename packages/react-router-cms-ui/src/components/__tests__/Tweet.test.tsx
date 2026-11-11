import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import { X_PROFILE_BASE_URL } from '../../data/data.links';
import type { TweetProps } from '../Tweet';
import { Tweet } from '../Tweet';

describe('Tweet Component', () => {
  let component: RenderResult;
  let props: TweetProps;

  beforeEach(() => {
    props = {
      handle: 'visormatt',
      image: 'https://picsum.photos/40/40',
      tweet: 'The tweet goes <b>here</b>',
      username: 'matthew',
    };

    const Component = (): React.ReactElement => {
      return <Tweet {...props} />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('links the handle to the X profile in a new tab', async () => {
    const link = await component.findByRole('link', { name: '@visormatt' });

    expect(link).toHaveAttribute('href', `${X_PROFILE_BASE_URL}visormatt`);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  test('shows the username initial while the avatar image loads', async () => {
    expect(await component.findByText('M')).toBeInTheDocument();
  });

  test('renders the server-supplied body markup', async () => {
    const body = await component.findByTestId('TweetBody');

    expect(body.querySelector('b')).toHaveTextContent('here');
  });
});
