import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { Tabs } from '@openthrottle/react-router-shadcn';
import { describe, expect, test } from 'vitest';
import type { GeneratorDetailCardFragment } from '~/__generated__/graphql';
import { GeneratorTabPresets } from '../GeneratorTabPresets';

const mockGenerator: GeneratorDetailCardFragment = {
  __typename: 'GeneratorDetailObject',
  description: 'd',
  name: 'react-router',
  schemaJson: null,
};

function renderTab(
  generator: GeneratorDetailCardFragment = mockGenerator,
): RenderResult {
  const Component = () => (
    <Tabs defaultValue="presets">
      <GeneratorTabPresets generator={generator} />
    </Tabs>
  );
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
}

describe('GeneratorTabPresets', () => {
  test('renders preset descriptions and commands for the generator', () => {
    const view = renderTab();

    expect(
      view.getByText('List installed generators in @tools/generators'),
    ).toBeInTheDocument();
    expect(
      view.getByText(
        /NX_ISOLATE_PLUGINS=false nx g @tools\/generators:react-router --describe/,
      ),
    ).toBeInTheDocument();
    expect(
      view.getByText(
        /NX_ISOLATE_PLUGINS=false pnpm nx g @tools\/generators:react-router --describe/,
      ),
    ).toBeInTheDocument();

    const copyButtons = view.getAllByRole('button', { name: 'Copy command' });
    expect(copyButtons).toHaveLength(5);
  });
});
