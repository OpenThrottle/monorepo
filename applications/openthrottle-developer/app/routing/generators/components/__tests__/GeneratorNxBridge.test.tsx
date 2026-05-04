import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { GeneratorNxBridge } from '../GeneratorNxBridge';
import type { GeneratorNxBridgeProps } from '../GeneratorNxBridge';

describe('GeneratorNxBridge', () => {
  let component: RenderResult;
  let props: GeneratorNxBridgeProps;

  beforeEach(() => {
    props = {
      generator: {
        description: 'Desc',
        name: 'remix',
        schemaJson: '{"a":1}',
      },
    };

    component = render(<GeneratorNxBridge {...props} />);
  });

  test('renders monorepo doc links and command presets', () => {
    expect(component.getByTestId('GeneratorNxBridge')).toBeInTheDocument();

    const agentUsage = component.getByRole('link', {
      name: /AGENT_USAGE\.md/,
    });
    expect(agentUsage).toHaveAttribute(
      'href',
      expect.stringContaining('docs/tools/templates/AGENT_USAGE.md'),
    );

    expect(
      component.getByText(
        /NX_ISOLATE_PLUGINS=false nx g @tools\/generators:remix --describe/,
      ),
    ).toBeInTheDocument();

    const toolsReadme = component.getByRole('link', {
      name: /@tools\/generators package/,
    });
    expect(toolsReadme).toHaveAttribute(
      'href',
      expect.stringContaining('tools/generators/README.md'),
    );
  });
});
