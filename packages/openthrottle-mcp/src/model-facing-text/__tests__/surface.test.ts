import { describe, expect, it } from 'vitest';

import { buildServerInstructions } from '../../config/index.ts';
import { DEFAULT_TOOLSETS, TOOLSET_NAMES } from '../../config/toolsets.ts';
import {
  developerMcpToolDefinitions,
  developerMcpToolsIn,
} from '../../tool-registry.ts';
import { measureToolSurface } from '../surface.ts';

describe('measureToolSurface', () => {
  it('measures every registered tool, sorted by name, tagged with its toolset', async () => {
    const surface = await measureToolSurface();
    const names = surface.tools.map((tool) => tool.name);

    expect(names).toHaveLength(developerMcpToolDefinitions.length);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    for (const tool of surface.tools) {
      expect(TOOLSET_NAMES).toContain(tool.toolset);
    }
  });

  it('lists exactly the default toolsets when nothing is configured', async () => {
    const surface = await measureToolSurface();
    const expected = developerMcpToolsIn(new Set(DEFAULT_TOOLSETS))
      .map((tool) => tool.name)
      .sort((a, b) => a.localeCompare(b));

    expect(surface.defaultToolsets).toEqual(DEFAULT_TOOLSETS);
    expect(surface.defaultToolNames).toEqual(expected);
  });

  it('counts the default instructions block in UTF-8 bytes', async () => {
    const surface = await measureToolSurface();

    expect(surface.instructionsBytes).toBe(
      Buffer.byteLength(
        buildServerInstructions(new Set(DEFAULT_TOOLSETS)),
        'utf8',
      ),
    );
  });

  it('sums per-tool totals into the full, default and per-toolset totals', async () => {
    const surface = await measureToolSurface();
    const sum = (tools: readonly { totalBytes: number }[]): number => {
      return tools.reduce((total, tool) => total + tool.totalBytes, 0);
    };
    const defaultNames = new Set(surface.defaultToolNames);

    expect(surface.toolsTotalBytes).toBe(sum(surface.tools));
    expect(surface.defaultToolsTotalBytes).toBe(
      sum(surface.tools.filter((tool) => defaultNames.has(tool.name))),
    );
    expect(sum(surface.toolsets)).toBe(surface.toolsTotalBytes);
    expect(surface.toolsets.map((toolset) => toolset.name)).toEqual(
      TOOLSET_NAMES,
    );
    for (const tool of surface.tools) {
      expect(tool.totalBytes).toBeGreaterThan(
        tool.descriptionBytes + tool.schemaBytes,
      );
    }
  });
});
