import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { BLOCKS_COPY } from '~/routing/blocks/data/data.copy';

import BlocksIndex from '../blocks._index';

describe('routes/blocks._index.tsx', () => {
  test('renders the page heading and the block preview', async () => {
    const Stub = createRoutesStub([
      { Component: BlocksIndex, path: '/blocks' },
    ]);
    const component = render(<Stub initialEntries={['/blocks']} />);

    expect(
      await component.findByRole('heading', {
        level: 1,
        name: BLOCKS_COPY.title,
      }),
    ).toBeInTheDocument();
    expect(component.getByTestId('BlocksPreview')).toBeInTheDocument();
  });
});
