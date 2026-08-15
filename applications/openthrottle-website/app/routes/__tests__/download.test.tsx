import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import Component from '../download';

describe('routes/download.tsx', () => {
  let component: RenderResult;

  beforeEach(() => {
    const RoutesStub = createRoutesStub([
      {
        Component,
        loader: () => ({
          introduction: 'This is a test intro',
          repo: 'openthrottle/example-repo',
        }),
        path: '/download',
      },
    ]);

    component = render(<RoutesStub initialEntries={['/download']} />);
  });

  test('preserves the original get-started page with the clone command', async () => {
    expect(
      await component.findByRole('link', { name: /view on github/i }),
    ).toBeInTheDocument();

    expect(
      component.getByRole('button', {
        name: 'git clone https://github.com/openthrottle/example-repo.git',
      }),
    ).toBeInTheDocument();
  });
});
