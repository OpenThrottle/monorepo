import { beforeAll, describe, expect, it } from 'vitest';

import type { ToolSurface } from '../../model-facing-text/list-tool-surface.ts';
import { listToolSurface } from '../../model-facing-text/list-tool-surface.ts';
import { TOOL_SELECTION_CASES } from './data/data.cases.ts';
import { HARNESS_TOOLS } from './data/data.harness-tools.ts';

/**
 * @description Structural checks on the case data against the LIVE tool surface — offline and free, so they run
 * in the ordinary test target. They catch a renamed or removed tool silently turning a case into one that can
 * never pass.
 */
describe('TOOL_SELECTION_CASES', () => {
  let surface: ToolSurface;

  beforeAll(async () => {
    surface = await listToolSurface();
  });

  it('has unique ids', () => {
    const ids = TOOL_SELECTION_CASES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('names only tools that exist on the surface or the harness', () => {
    const known = new Set([
      ...surface.tools.map((t) => t.name),
      ...HARNESS_TOOLS.map((t) => t.name),
    ]);
    const named = TOOL_SELECTION_CASES.flatMap((c) => [
      ...c.forbid,
      ...(c.expect.kind === 'call' ? c.expect.tools : []),
    ]);

    expect(named.filter((name) => !known.has(name))).toEqual([]);
  });

  it('never collides a harness tool name with an OT tool', () => {
    const ot = new Set(surface.tools.map((t) => t.name));
    expect(HARNESS_TOOLS.filter((t) => ot.has(t.name))).toEqual([]);
  });

  it('only matches args the expected tools declare', () => {
    const schemaProps = new Map(
      surface.tools.map((t) => [
        t.name,
        new Set(Object.keys(t.inputSchema.properties ?? {})),
      ]),
    );
    const unknown = TOOL_SELECTION_CASES.flatMap((c) =>
      c.expect.kind === 'call'
        ? Object.keys(c.expect.args).flatMap((arg) =>
            c.expect.kind === 'call' &&
            c.expect.tools.every((tool) => !schemaProps.get(tool)?.has(arg))
              ? [`${c.id}.${arg}`]
              : [],
          )
        : [],
    );

    expect(unknown).toEqual([]);
  });

  it('carries control cases — at least a sixth of the suite', () => {
    const controls = TOOL_SELECTION_CASES.filter(
      (c) => c.expect.kind === 'no-call',
    );
    expect(controls.length * 6).toBeGreaterThanOrEqual(
      TOOL_SELECTION_CASES.length,
    );
    expect(controls.every((c) => c.area === 'control')).toBe(true);
  });

  it('covers plan/task CRUD, semantic search and the follow-up flow', () => {
    const areas = new Set(TOOL_SELECTION_CASES.map((c) => c.area));
    expect([...areas].sort()).toEqual([
      'control',
      'follow-up',
      'output',
      'plan-crud',
      'search',
      'task-crud',
    ]);
  });
});
