import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import type { ImageProps } from '../Image';
import { Image } from '../Image';

describe('Image Component', () => {
  let component: RenderResult;
  let props: ImageProps;

  beforeEach(() => {
    props = {
      alt: 'A mountain lake',
      aspectRatio: '16 / 9',
      className: 'border',
      src: 'https://picsum.photos/id/503/2500/800',
    };

    const Component = (): React.ReactElement => {
      return <Image {...props} />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders the image with its alt text and source', async () => {
    const image = await component.findByRole('img', {
      name: 'A mountain lake',
    });

    expect(image).toHaveAttribute('src', props.src);
  });

  test('applies the aspect ratio to the image', async () => {
    const image = await component.findByRole('img');

    expect(image.style.aspectRatio).toBe('16 / 9');
  });

  test('applies the caller className to the wrapper', async () => {
    const image = await component.findByRole('img');

    expect(image.parentElement).toHaveClass('border');
  });

  test('outlines the block in debug mode', () => {
    expect(Image.debug.className).toBe('!border-orange-500');
  });
});
