import * as React from 'react';
import { beforeEach, describe, expect, test } from 'vitest';
import { default as Route } from '../generators.$generatorId';
import { render, RenderResult } from '@testing-library/react';

describe.skip('routes/generators.$generatorId.tsx', () => {
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
