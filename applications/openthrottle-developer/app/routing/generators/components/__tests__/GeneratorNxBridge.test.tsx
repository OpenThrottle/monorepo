import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test } from 'vitest';
import { GeneratorNxBridge } from '../GeneratorNxBridge';
import type { GeneratorNxBridgeProps } from '../GeneratorNxBridge';

describe('GeneratorNxBridge', () => {
  let component: RenderResult;
  let props: GeneratorNxBridgeProps;

  beforeEach(() => {
    localStorage.clear();

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

    expect(
      component.getByText(
        /NX_ISOLATE_PLUGINS=false pnpm nx g @tools\/generators:remix --describe/,
      ),
    ).toBeInTheDocument();

    expect(
      component.getByText(
        /NX_ISOLATE_PLUGINS=false nx g @tools\/generators:remix --dry-run/,
      ),
    ).toBeInTheDocument();

    const toolsReadme = component.getByRole('link', {
      name: /@tools\/generators package/,
    });
    expect(toolsReadme).toHaveAttribute(
      'href',
      expect.stringContaining('tools/generators/README.md'),
    );

    const nxDev = component.getByRole('link', {
      name: /Nx — local generators/,
    });
    expect(nxDev).toHaveAttribute(
      'href',
      expect.stringContaining('nx.dev/extending-nx/local-generators'),
    );
  });

  test('persists last CLI output to localStorage for support bundles', async () => {
    const user = userEvent.setup();
    const key = 'openthrottle-developer:generator-cli-last-run:remix';
    const box = component.getByPlaceholderText(
      /Paste terminal output after running a generator command/,
    );

    await user.type(box, 'error: missing flag');

    expect(localStorage.getItem(key)).toBe('error: missing flag');
  });
});
