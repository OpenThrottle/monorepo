import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import type { z } from 'zod';
import { McpDeveloperMcpSurface } from './nest/openthrottle-mcp-mcp-surface.js';
import { developerMcpToolDefinitions } from './tool-registry.js';

/**
 * @description `@rekog/mcp-nest` stores `@Tool` options under this Reflect metadata key on the decorated method.
 */
const MCP_TOOL_METADATA_KEY = 'mcp:tool';

type SurfaceToolMetadata = {
  description?: string;
  name?: string;
  parameters?: z.ZodType;
};

/**
 * @description Reads every `@Tool` decorator's metadata off the Nest surface prototype, keyed by wire tool name.
 */
const readSurfaceTools = (): Map<string, SurfaceToolMetadata> => {
  const prototype: object = McpDeveloperMcpSurface.prototype;
  const tools = new Map<string, SurfaceToolMetadata>();

  for (const methodName of Object.getOwnPropertyNames(prototype)) {
    const descriptor = Object.getOwnPropertyDescriptor(prototype, methodName);
    const method = descriptor?.value;
    if (typeof method !== 'function') continue;

    const metadata: SurfaceToolMetadata | undefined = Reflect.getMetadata(
      MCP_TOOL_METADATA_KEY,
      method,
    );
    if (!metadata?.name) continue;

    tools.set(metadata.name, metadata);
  }

  return tools;
};

describe('developer MCP tool surface parity', () => {
  const registryByName = new Map(
    developerMcpToolDefinitions.map((tool) => [tool.name, tool]),
  );
  const surfaceByName = readSurfaceTools();

  it('exposes the same set of tool names from the registry and the Nest surface', () => {
    const registryNames = [...registryByName.keys()].sort();
    const surfaceNames = [...surfaceByName.keys()].sort();

    expect(surfaceNames).toEqual(registryNames);
  });

  it('has no duplicate tool names in the registry', () => {
    const names = developerMcpToolDefinitions.map((tool) => tool.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('shares the identical parameter schema and description per tool across both registrations', () => {
    for (const [name, registryTool] of registryByName) {
      const surfaceTool = surfaceByName.get(name);

      expect(
        surfaceTool,
        `Nest surface is missing tool "${name}"`,
      ).toBeDefined();
      // Reference identity: both registrations must read the same exported
      // `*ToolParameters` schema, so a param change can never diverge.
      expect(surfaceTool?.parameters).toBe(registryTool.parameters);
      expect(surfaceTool?.description).toBe(registryTool.description);
    }
  });
});
