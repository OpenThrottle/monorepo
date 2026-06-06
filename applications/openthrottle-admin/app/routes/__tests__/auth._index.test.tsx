import * as React from 'react';
import { beforeEach, describe, expect, test } from 'vitest';
import { default as Route } from '../auth._index';
import { render, RenderResult } from '@testing-library/react';

describe.skip('routes/auth._index.tsx', () => {
  let component: RenderResult;

  beforeEach(() => {
    component = render(
      <Route
        actionData={{} as any}
        loaderData={{} as any}
        matches={[] as any}
        params={{} as any}
      />,
    );
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
