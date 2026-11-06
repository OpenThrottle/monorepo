import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type {
  Budget,
  Measurement,
  ToolSurface,
} from '../check-model-facing-text.ts';
import {
  BUDGET_PATH,
  calibratedCap,
  diffSnapshot,
  findCapBreaches,
  findStaleOverrides,
  formatChange,
  measure,
  parseBudget,
  parseSnapshot,
  parseToolSurface,
  renderSnapshot,
} from '../check-model-facing-text.ts';

const SURFACE: ToolSurface = {
  defaultToolNames: ['create_plan', 'get_plan'],
  instructionsBytes: 100,
  tools: [
    { descriptionBytes: 40, name: 'create_plan', toolset: 'core', totalBytes: 200 }, // prettier-ignore
    { descriptionBytes: 10, name: 'get_plan', toolset: 'core', totalBytes: 80 },
    { descriptionBytes: 30, name: 'list_blog_posts', toolset: 'blog', totalBytes: 500 }, // prettier-ignore
  ],
};

const BUDGET: Budget = {
  perItem: {
    mcpToolDescription: 1000,
    mcpToolEntry: 1000,
    promptFile: 1000,
    skillBody: 1000,
    skillDescription: 1000,
  },
  perItemOverrides: {},
  totals: {
    alwaysInjected: 10_000,
    mcpInstructions: 1000,
    mcpTools: 10_000,
    prompts: 10_000,
    skills: 10_000,
  },
};

describe('check-model-facing-text', () => {
  let root: string;

  const write = (path: string, contents: string): void => {
    const absolute = join(root, path);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, contents);
  };

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'model-facing-text-'));
  });

  afterEach(() => {
    rmSync(root, { force: true, recursive: true });
  });

  describe('measure', () => {
    it('keys every surface and sums the always-injected total', () => {
      write('skills/alpha/SKILL.md', '---\nname: alpha\ndescription: héllo\n---\nbody\n'); // prettier-ignore
      write('skills/no-skill-file/README.md', 'ignored');
      write('.agents/prompts/Job_A.md', 'prompt');
      write('.agents/prompts/notes.txt', 'ignored');

      const measurement = measure(root, SURFACE);
      const descriptionBytes = Buffer.byteLength('héllo', 'utf8');

      expect(Object.keys(measurement.items)).toEqual([
        'mcp.instructions',
        'mcp.tool/create_plan',
        'mcp.tool/get_plan',
        'mcp.tool/list_blog_posts',
        'mcp.toolDescription/create_plan',
        'mcp.toolDescription/get_plan',
        'mcp.toolDescription/list_blog_posts',
        'prompt/Job_A.md',
        'skill/alpha',
        'skillDescription/alpha',
      ]);
      expect(measurement.items['skillDescription/alpha']).toBe(
        descriptionBytes,
      );
      expect(measurement.totals).toEqual({
        alwaysInjected: 100 + 280 + descriptionBytes,
        mcpInstructions: 100,
        mcpTools: 280,
        prompts: 6,
        skills: measurement.items['skill/alpha'],
      });
    });

    it('caps only the default toolset and reports the full surface per toolset', () => {
      const measurement = measure(root, SURFACE);

      expect(measurement.totals.mcpTools).toBe(280);
      expect(measurement.reported).toEqual({
        mcpToolsFull: 780,
        'mcpToolset/blog': 500,
        'mcpToolset/core': 280,
      });
    });

    it('treats missing skills and prompts directories as empty', () => {
      const measurement = measure(root, SURFACE);

      expect(measurement.totals.skills).toBe(0);
      expect(measurement.totals.prompts).toBe(0);
    });
  });

  describe('diffSnapshot', () => {
    it('reports growth and new items as grew', () => {
      const diff = diffSnapshot({ a: 10, b: 5 }, { a: 12, b: 5, c: 1 });

      expect(diff.grew.map((change) => change.key)).toEqual(['a', 'c']);
      expect(diff.shrank).toEqual([]);
    });

    it('reports shrinkage and removed items as shrank', () => {
      const diff = diffSnapshot({ a: 10, gone: 3 }, { a: 4 });

      expect(diff.grew).toEqual([]);
      expect(diff.shrank.map((change) => change.key)).toEqual(['a', 'gone']);
    });

    it('reports nothing when the measurement matches', () => {
      expect(diffSnapshot({ a: 1 }, { a: 1 })).toEqual({
        grew: [],
        shrank: [],
      });
    });
  });

  describe('findCapBreaches', () => {
    const measurement: Measurement = {
      items: { 'mcp.tool/create_plan': 1001, 'skill/alpha': 999 },
      reported: {},
      totals: { ...BUDGET.totals, mcpTools: 10_001 },
    };

    it('flags per-item caps by key prefix and totals', () => {
      expect(findCapBreaches(measurement, BUDGET)).toEqual([
        { bytes: 1001, cap: 1000, key: 'mcp.tool/create_plan' },
        { bytes: 10_001, cap: 10_000, key: 'total/mcpTools' },
      ]);
    });

    it('passes when everything is at or under its cap', () => {
      expect(findCapBreaches({ items: {}, reported: {}, totals: BUDGET.totals }, BUDGET)).toEqual([]); // prettier-ignore
    });

    it('applies a per-item override instead of the class cap', () => {
      const budget: Budget = {
        ...BUDGET,
        perItemOverrides: { 'skill/alpha': { cap: 2000, reason: 'r' } },
      };
      const items = { 'skill/alpha': 1500, 'skill/beta': 1500 };

      expect(findCapBreaches({ items, reported: {}, totals: BUDGET.totals }, budget)).toEqual([
        { bytes: 1500, cap: 1000, key: 'skill/beta' },
      ]); // prettier-ignore
    });
  });

  describe('findStaleOverrides', () => {
    const budget: Budget = {
      ...BUDGET,
      perItem: { ...BUDGET.perItem, skillBody: 10_000 },
      perItemOverrides: {
        'skill/big': { cap: 12_288, reason: 'r' },
        'skill/gone': { cap: 12_288, reason: 'r' },
        'skill/shrunk': { cap: 12_288, reason: 'r' },
      },
    };

    it('reports overrides whose item is gone or whose headroom now fits the class cap', () => {
      // big: 9000 × 1.2 → 11264 > 10000, still needed. shrunk: 5000 × 1.2 → 6144, fits.
      const items = { 'skill/big': 9000, 'skill/shrunk': 5000 };

      expect(findStaleOverrides({ items, reported: {}, totals: BUDGET.totals }, budget)).toEqual([
        'skill/gone',
        'skill/shrunk',
      ]); // prettier-ignore
    });
  });

  describe('calibratedCap', () => {
    it('adds 20% headroom and rounds up to 1 KiB', () => {
      expect(calibratedCap(33_817)).toBe(40_960);
      expect(calibratedCap(1024)).toBe(2048);
    });
  });

  describe('parsers', () => {
    it('parses the committed budget file', () => {
      const raw: unknown = JSON.parse(readFileSync(join(process.cwd(), BUDGET_PATH), 'utf8')); // prettier-ignore

      expect(parseBudget(raw).totals.alwaysInjected).toBeGreaterThan(0);
    });

    it('rejects an override without a reason', () => {
      const raw = { perItem: BUDGET.perItem, perItemOverrides: { 'skill/alpha': { cap: 2000, reason: ' ' } }, totals: BUDGET.totals }; // prettier-ignore

      expect(() => parseBudget(raw, 'x')).toThrow('perItemOverrides.skill/alpha needs a non-empty "reason"'); // prettier-ignore
    });

    it('rejects an override that does not exceed its class cap', () => {
      const raw = { perItem: BUDGET.perItem, perItemOverrides: { 'skill/alpha': { cap: 1000, reason: 'r' } }, totals: BUDGET.totals }; // prettier-ignore

      expect(() => parseBudget(raw, 'x')).toThrow('must exceed its class cap 1000'); // prettier-ignore
    });

    it('rejects an override for an uncapped key', () => {
      const raw = { perItem: BUDGET.perItem, perItemOverrides: { 'mcp.instructions': { cap: 5000, reason: 'r' } }, totals: BUDGET.totals }; // prettier-ignore

      expect(() => parseBudget(raw, 'x')).toThrow('names no capped item kind'); // prettier-ignore
    });

    it('rejects a budget missing a cap', () => {
      expect(() => parseBudget({ perItem: {}, totals: {} }, 'x')).toThrow('x: expected a number at "mcpToolDescription"'); // prettier-ignore
    });

    it('rejects a malformed tool surface', () => {
      expect(() => parseToolSurface({ tools: 'nope' }, 'surface')).toThrow('surface'); // prettier-ignore
      expect(() => parseToolSurface({ defaultToolNames: [], instructionsBytes: 1, tools: [{ descriptionBytes: 1, name: 'a', totalBytes: 2 }] }, 'surface')).toThrow('"toolset"'); // prettier-ignore
    });

    it('round-trips a rendered snapshot', () => {
      const measurement = measure(root, SURFACE);

      expect(parseSnapshot(JSON.parse(renderSnapshot(measurement)))).toEqual(measurement.items); // prettier-ignore
    });
  });

  describe('formatChange', () => {
    it('shows before, after and a signed delta', () => {
      expect(formatChange({ after: 12, before: 10, key: 'a' })).toBe('  a: 10 B → 12 B (+2 B)'); // prettier-ignore
      expect(formatChange({ after: undefined, before: 3, key: 'b' })).toBe('  b: 3 B → — (-3 B)'); // prettier-ignore
    });
  });
});
