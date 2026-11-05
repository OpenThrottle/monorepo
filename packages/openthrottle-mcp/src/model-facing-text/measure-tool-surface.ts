/**
 * @description Measures the model-facing text the stdio MCP server injects into every client session: the
 * server `instructions` block and each tool's wire entry (name + description + JSON input schema) exactly as a
 * client receives it from `tools/list` (see {@link listToolSurface}).
 */

import { listToolSurface } from './list-tool-surface.ts';

/**
 * @description Byte counts for one tool's `tools/list` entry.
 */
export interface ToolTextMeasurement {
  readonly descriptionBytes: number;
  readonly name: string;
  readonly schemaBytes: number;
  readonly totalBytes: number;
}

/**
 * @description Byte counts for the whole stdio MCP surface.
 */
export interface ToolSurfaceMeasurement {
  readonly instructionsBytes: number;
  readonly tools: readonly ToolTextMeasurement[];
  readonly toolsTotalBytes: number;
}

const byteLength = (text: string): number => Buffer.byteLength(text, 'utf8');

/**
 * @description Lists the stdio tool surface and measures it. Tools arrive sorted by name so the output diffs
 * cleanly.
 * @public
 */
export async function measureToolSurface(): Promise<ToolSurfaceMeasurement> {
  const { instructions, tools } = await listToolSurface();
  const measured = tools.map((tool): ToolTextMeasurement => {
    const descriptionBytes = byteLength(tool.description ?? '');
    const schemaBytes = byteLength(JSON.stringify(tool.inputSchema));

    return {
      descriptionBytes,
      name: tool.name,
      schemaBytes,
      totalBytes: byteLength(JSON.stringify(tool)),
    };
  });

  return {
    instructionsBytes: byteLength(instructions),
    tools: measured,
    toolsTotalBytes: measured.reduce((sum, t) => sum + t.totalBytes, 0),
  };
}
