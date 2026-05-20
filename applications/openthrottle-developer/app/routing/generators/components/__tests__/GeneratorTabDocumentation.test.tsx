import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { Tabs } from '@openthrottle/react-router-shadcn';
import { describe, expect, test } from 'vitest';
import {
  GENERATOR_DOCS_AGENT_USAGE,
  GENERATOR_DOCS_AGENTS,
  GENERATOR_DOCS_NX_LOCAL_GENERATORS,
  GENERATOR_DOCS_PERSONAL_GENERATORS,
  GENERATOR_DOCS_TOOLS_PACKAGE_README,
} from '~/routing/generators/constants/generator-nx-docs';
import { GeneratorTabDocumentation } from '../GeneratorTabDocumentation';

function renderTab(): RenderResult {
  const Component = () => (
    <Tabs defaultValue="documentation">
      <GeneratorTabDocumentation />
    </Tabs>
  );
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
}

describe('GeneratorTabDocumentation', () => {
  test('lists canonical doc links with correct destinations', () => {
    const view = renderTab();

    expect(
      view.getByRole('link', { name: /Nx — local generators/ }),
    ).toHaveAttribute('href', GENERATOR_DOCS_NX_LOCAL_GENERATORS);

    expect(
      view.getByRole('link', { name: /@tools\/generators package/ }),
    ).toHaveAttribute('href', GENERATOR_DOCS_TOOLS_PACKAGE_README);

    expect(
      view.getByRole('link', { name: /Generator-first rule/ }),
    ).toHaveAttribute('href', GENERATOR_DOCS_PERSONAL_GENERATORS);

    expect(view.getByRole('link', { name: /AGENTS\.md/ })).toHaveAttribute(
      'href',
      GENERATOR_DOCS_AGENTS,
    );

    expect(view.getByRole('link', { name: /Generator usage/ })).toHaveAttribute(
      'href',
      GENERATOR_DOCS_AGENT_USAGE,
    );

    expect(
      view.getByText(/Clone path for local reference/),
    ).toBeInTheDocument();
  });
});
