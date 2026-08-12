import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  isPlanStatus,
  isTaskStatus,
  PLAN_STATUS,
  PLAN_STATUS_VALUES,
  TASK_STATUS,
  TASK_STATUS_VALUES,
} from './plan-task-status.constants';

/**
 * Ascends from the working directory to the monorepo root (the first ancestor
 * that contains `databases/migrations`). Nx runs test targets from the workspace
 * root, so this resolves the committed migrations regardless of project layout.
 */
function findMigrationsDir(): string {
  let dir = process.cwd();

  for (let depth = 0; depth < 12; depth += 1) {
    const candidate = join(dir, 'databases', 'migrations');
    if (existsSync(candidate)) return candidate;
    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }

  throw new Error('Could not locate databases/migrations from the test file.');
}

/**
 * Parses every migration for the authoritative `plan_task_status` enum labels:
 * the `CREATE TYPE plan_task_status AS ENUM ( ... )` members plus any
 * `ALTER TYPE plan_task_status ADD VALUE '...'` additions. This is the committed
 * DB source of truth, so the SSOT const must equal it exactly.
 */
function readDbEnumLabels(): Set<string> {
  const migrationsDir = findMigrationsDir();
  const labels = new Set<string>();

  const files = readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), 'utf8');

    // CREATE TYPE plan_task_status AS ENUM ( 'A', 'B', ... )
    const createMatch = sql.match(
      /CREATE\s+TYPE\s+plan_task_status\s+AS\s+ENUM\s*\(([\s\S]*?)\)/i,
    );
    if (createMatch) {
      for (const label of createMatch[1].matchAll(/'([A-Z_]+)'/g)) {
        labels.add(label[1]);
      }
    }

    // ALTER TYPE plan_task_status ADD VALUE [IF NOT EXISTS] 'X' [BEFORE/AFTER 'Y']
    for (const alter of sql.matchAll(
      /ALTER\s+TYPE\s+plan_task_status\s+ADD\s+VALUE\s+(?:IF\s+NOT\s+EXISTS\s+)?'([A-Z_]+)'/gi,
    )) {
      labels.add(alter[1]);
    }
  }

  return labels;
}

describe('plan-task-status SSOT', () => {
  it('PLAN_STATUS matches the Postgres plan_task_status enum labels from the migrations', () => {
    const dbLabels = [...readDbEnumLabels()].sort();

    // Sanity: the parser actually found the enum (guards against a silent
    // regex/path failure making the assertion vacuously pass).
    expect(dbLabels.length).toBeGreaterThan(0);

    expect(dbLabels).toEqual([...PLAN_STATUS_VALUES].sort());
  });

  it('TASK_STATUS is PLAN_STATUS minus QUEUED (plans-only)', () => {
    expect([...TASK_STATUS_VALUES].sort()).toEqual(
      PLAN_STATUS_VALUES.filter((s) => s !== PLAN_STATUS.QUEUED).sort(),
    );
    expect(TASK_STATUS_VALUES).not.toContain(PLAN_STATUS.QUEUED);
  });

  it('keys and values are identical (labels are their own key)', () => {
    for (const [key, value] of Object.entries(PLAN_STATUS)) {
      expect(value).toBe(key);
    }
    for (const [key, value] of Object.entries(TASK_STATUS)) {
      expect(value).toBe(key);
    }
  });

  it('uses single-L CANCELED and never FAILED (that is the plan_runs domain)', () => {
    expect(PLAN_STATUS_VALUES).toContain('CANCELED');
    expect(PLAN_STATUS_VALUES).not.toContain('CANCELLED');
    expect(PLAN_STATUS_VALUES).not.toContain('FAILED');
  });

  it('type guards accept canonical values and reject unknown / mis-cased ones', () => {
    expect(isPlanStatus('QUEUED')).toBe(true);
    expect(isTaskStatus('QUEUED')).toBe(false);
    expect(isTaskStatus('PENDING')).toBe(true);
    expect(isPlanStatus('pending')).toBe(false);
    expect(isPlanStatus('CANCELLED')).toBe(false);
    expect(isPlanStatus('DRAFT')).toBe(false);
  });
});
