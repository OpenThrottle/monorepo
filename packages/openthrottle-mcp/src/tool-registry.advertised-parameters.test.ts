import 'reflect-metadata';

import { beforeAll, describe, expect, it } from 'vitest';

import { TOOLSET_NAMES } from './config/toolsets.ts';
import type { ToolSurface } from './model-facing-text/list-tool-surface.ts';
import { listToolSurface } from './model-facing-text/list-tool-surface.ts';
import { developerMcpToolDefinitions } from './tool-registry.ts';

/**
 * @description Regression suite for the hidden-arguments defect: `get_activity_by_date` and `get_blog_post`
 * registered a zod v3 `.refine()`d object. That is a ZodEffects, which the MCP SDK serializes as
 * `properties: {}`, so every client was told the tools take no arguments. The tool-selection eval caught it —
 * "What did we ship yesterday?" went to `bash` because `daysBack` was invisible.
 *
 * Asserted against the wire (`tools/list`) rather than the zod objects, for every tool, so a tool added later
 * cannot reintroduce it.
 */

const shapeKeysOf = (schema: unknown): readonly string[] | undefined => {
  if (typeof schema !== 'object' || schema === null) return undefined;
  if (!('shape' in schema)) return undefined;
  const { shape } = schema;
  if (typeof shape !== 'object' || shape === null) return undefined;
  return Object.keys(shape).sort();
};

describe('developer MCP tools advertise their parameters', () => {
  let surface: ToolSurface;

  beforeAll(async () => {
    surface = await listToolSurface(new Set(TOOLSET_NAMES));
  });

  it.each(
    developerMcpToolDefinitions.map((tool) => [tool.name, tool] as const),
  )('%s registers a plain object schema', (name, tool) => {
    expect(
      shapeKeysOf(tool.parameters),
      `Tool "${name}" registers a schema with no object shape (a .refine()/.transform() wrapper?) — tools/list would advertise no properties`,
    ).toBeDefined();
  });

  it.each(
    developerMcpToolDefinitions.map((tool) => [tool.name, tool] as const),
  )('%s lists every parameter on tools/list', (name, tool) => {
    const advertised = surface.tools.find((t) => t.name === name);

    expect(advertised, `Tool "${name}" missing from tools/list`).toBeDefined();
    expect(
      Object.keys(advertised?.inputSchema.properties ?? {}).sort(),
    ).toEqual(shapeKeysOf(tool.parameters));
  });
});
