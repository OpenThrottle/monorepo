/**
 * Claude Code memory-index guard (PostToolUse hook).
 *
 * `MEMORY.md` is injected into every session under a size cap. Over the cap the
 * harness truncates at the last whole line instead of refusing: the write
 * succeeds, nothing errors, and the tail is absent from every future session.
 * Because entries are appended and eviction is positional, the memories lost are
 * the newest ones.
 *
 * A hook already reported the file's size after a write. Size alone is the part
 * the author can already see — this one names the entries that would go dark.
 *
 * It reads the file from DISK rather than the tool payload, so it is correct for
 * `Write`, `Edit` and `MultiEdit` alike without reimplementing any of them: the
 * bytes on disk are what the loader will read.
 *
 * Exits 2 with the report on stderr when the index is over budget — the Claude
 * Code contract for "surface this to the model in this turn". Every other path,
 * including any internal failure, exits 0: a guard that blocks writes because it
 * crashed is worse than the truncation it prevents.
 */
import fs from 'node:fs';
import path from 'node:path';

import { isRecord } from '@openthrottle/nodejs-utils';

import { logHookError } from '../../index';
import {
  DEFAULT_BUDGET,
  formatBudgetReport,
  reportIndexBudget,
} from '../../memory/index-budget';

/**
 * True for a memory index: `MEMORY.md` directly inside a `memory/` directory.
 *
 * Deliberately not anchored to `~/.claude/projects/…`: memory directories are
 * addressed differently across hosts and a path-prefix match would silently stop
 * matching the day that layout changes — reintroducing the exact class of silent
 * failure this guard exists to close.
 */
export const isMemoryIndexPath = (filePath: string): boolean =>
  path.basename(filePath) === 'MEMORY.md' &&
  path.basename(path.dirname(filePath)) === 'memory';

/** Pull the written file's path out of a PostToolUse payload. */
export const readEditedPath = (raw: unknown): string | null => {
  if (!isRecord(raw)) return null;
  const toolInput = isRecord(raw.tool_input) ? raw.tool_input : {};
  const filePath = toolInput.file_path;
  return typeof filePath === 'string' && filePath.trim() !== ''
    ? filePath
    : null;
};

/** Budget override, for when the real harness cap becomes known. */
const resolveBudget = (): number => {
  const raw = process.env.OPENTHROTTLE_MEMORY_INDEX_BUDGET;
  if (typeof raw !== 'string' || raw.trim() === '') return DEFAULT_BUDGET;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_BUDGET;
};

const main = (): number => {
  try {
    const stdinBuf = fs.readFileSync(0, 'utf8');
    if (!stdinBuf || !stdinBuf.trim()) return 0;

    let raw: unknown;
    try {
      raw = JSON.parse(stdinBuf);
    } catch (err) {
      logHookError('memory-index-guard: invalid JSON stdin', err);
      return 0;
    }

    const filePath = readEditedPath(raw);
    if (!filePath || !isMemoryIndexPath(filePath)) return 0;
    if (!fs.existsSync(filePath)) return 0;

    const content = fs.readFileSync(filePath, 'utf8');
    const report = reportIndexBudget(content, resolveBudget());
    if (!report.overBudget) return 0;

    process.stderr.write(`${formatBudgetReport(report)}\n`);
    return 2;
  } catch (err) {
    logHookError('memory-index-guard failed', err);
    return 0;
  }
};

process.exit(main());
