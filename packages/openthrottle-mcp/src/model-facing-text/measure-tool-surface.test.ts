import { describe, expect, it } from 'vitest';

import { SERVER_INSTRUCTIONS } from '../config/index.ts';
import { developerMcpToolDefinitions } from '../tool-registry.ts';
import { measureToolSurface } from './measure-tool-surface.ts';

describe('measureToolSurface', () => {
  it('measures every registered tool, sorted by name', async () => {
    const surface = await measureToolSurface();
    const names = surface.tools.map((tool) => tool.name);

    expect(names).toHaveLength(developerMcpToolDefinitions.length);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it('counts the instructions block in UTF-8 bytes', async () => {
    const surface = await measureToolSurface();

    expect(surface.instructionsBytes).toBe(
      Buffer.byteLength(SERVER_INSTRUCTIONS, 'utf8'),
    );
  });

  it('sums per-tool totals, each covering its description and schema', async () => {
    const surface = await measureToolSurface();

    expect(surface.toolsTotalBytes).toBe(
      surface.tools.reduce((sum, tool) => sum + tool.totalBytes, 0),
    );
    for (const tool of surface.tools) {
      expect(tool.totalBytes).toBeGreaterThan(
        tool.descriptionBytes + tool.schemaBytes,
      );
    }
  });
});
