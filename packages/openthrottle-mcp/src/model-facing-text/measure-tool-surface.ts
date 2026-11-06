/**
 * @description Measures the model-facing text the stdio MCP server injects into client sessions: the server
 * `instructions` block and each tool's wire entry (name + description + JSON input schema) exactly as a client
 * receives it from `tools/list` (see {@link listToolSurface}).
 *
 * Two listings, because a client's cost depends on its toolset selection:
 *
 *   - the **default** listing, what a client gets with no configuration, gives `instructionsBytes` and
 *     `defaultToolsTotalBytes`, the bytes the budget caps;
 *   - the **full** listing (every toolset) gives `tools`, every tool tagged with its toolset, plus the
 *     per-toolset and full totals, which the budget reports.
 */

import type { ToolsetName } from '../config/toolsets.ts';
import { DEFAULT_TOOLSETS, TOOLSET_NAMES } from '../config/toolsets.ts';
import { developerMcpToolDefinitions } from '../tool-registry.ts';
import { listToolSurface } from './list-tool-surface.ts';

/**
 * @description Byte counts for one tool's `tools/list` entry.
 */
export interface ToolTextMeasurement {
  readonly descriptionBytes: number;
  readonly name: string;
  readonly schemaBytes: number;
  readonly toolset: ToolsetName;
  readonly totalBytes: number;
}

/**
 * @description Byte counts for one toolset's tools.
 */
export interface ToolsetMeasurement {
  readonly name: ToolsetName;
  readonly toolCount: number;
  readonly totalBytes: number;
}

/**
 * @description Byte counts for the stdio MCP surface: the default listing plus the full one.
 */
export interface ToolSurfaceMeasurement {
  readonly defaultToolNames: readonly string[];
  readonly defaultToolsTotalBytes: number;
  readonly defaultToolsets: readonly ToolsetName[];
  readonly instructionsBytes: number;
  readonly tools: readonly ToolTextMeasurement[];
  readonly toolsTotalBytes: number;
  readonly toolsets: readonly ToolsetMeasurement[];
}

const byteLength = (text: string): number => {
  return Buffer.byteLength(text, 'utf8');
};

const sumBytes = (tools: readonly { totalBytes: number }[]): number => {
  return tools.reduce((sum, tool) => sum + tool.totalBytes, 0);
};

/**
 * @description Lists the default and full stdio tool surfaces and measures them. Tools arrive sorted by name
 * so the output diffs cleanly.
 * @public
 */
export async function measureToolSurface(): Promise<ToolSurfaceMeasurement> {
  const [defaultSurface, fullSurface] = await Promise.all([
    listToolSurface(new Set(DEFAULT_TOOLSETS)),
    listToolSurface(new Set(TOOLSET_NAMES)),
  ]);
  const toolsetByName = new Map(
    developerMcpToolDefinitions.map((tool) => [tool.name, tool.toolset]),
  );

  const tools = fullSurface.tools.map((tool): ToolTextMeasurement => {
    const toolset = toolsetByName.get(tool.name);
    if (toolset === undefined) {
      throw new Error(`Tool "${tool.name}" is listed but not in the registry`);
    }

    return {
      descriptionBytes: byteLength(tool.description ?? ''),
      name: tool.name,
      schemaBytes: byteLength(JSON.stringify(tool.inputSchema)),
      toolset,
      totalBytes: byteLength(JSON.stringify(tool)),
    };
  });

  const defaultToolNames = defaultSurface.tools.map((tool) => tool.name);
  const defaultNameSet = new Set(defaultToolNames);

  return {
    defaultToolNames,
    defaultToolsTotalBytes: sumBytes(tools.filter((t) => defaultNameSet.has(t.name))), // prettier-ignore
    defaultToolsets: DEFAULT_TOOLSETS,
    instructionsBytes: byteLength(defaultSurface.instructions),
    tools,
    toolsTotalBytes: sumBytes(tools),
    toolsets: TOOLSET_NAMES.map((name): ToolsetMeasurement => {
      const members = tools.filter((tool) => tool.toolset === name);

      return { name, toolCount: members.length, totalBytes: sumBytes(members) };
    }),
  };
}
