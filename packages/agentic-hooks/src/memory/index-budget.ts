/**
 * Memory-index budget: does this `MEMORY.md` survive injection intact, and if
 * not, exactly which entries go dark?
 *
 * `MEMORY.md` is injected into every session under a size cap. Over the cap the
 * harness **truncates at the last whole line** rather than rejecting the write:
 * the write succeeds, nothing errors, and the tail is silently absent. Because
 * eviction is positional and entries are appended, the **newest** memories are
 * the ones lost — the inverted policy.
 *
 * This module is pure so the rule can be tested without a hook, a filesystem or
 * a session. The adapter in `adapters/claude/memory-index-guard.ts` supplies the
 * file contents and turns the report into a blocking hook response.
 */

/**
 * Characters, NOT bytes.
 *
 * This is the trap this module exists to avoid. On the observed failure the file
 * was 25,435 **bytes** but 25,022 **characters** — multibyte punctuation (em
 * dashes, curly quotes, arrows) diverged the two by over 400. A guard counting
 * bytes would have flagged a file that was actually fine; a guard counting bytes
 * against a character cap can equally pass a file that still truncates. The
 * loader measures characters, so this measures characters.
 */
export const measureIndex = (content: string): number => content.length;

/**
 * The injection cap, in characters.
 *
 * **Inferred, not documented.** The harness reports the cap only as a rounded
 * "24.4KB" in a session-reminder warning, and the CLI ships as a Bun-compiled
 * binary whose strings are not readable, so it cannot be confirmed at source.
 * The arithmetic is what settles it: 25,000 / 1024 = 24.41, which renders as
 * exactly the observed "24.4KB". The one recorded truncation is consistent —
 * a 25,022-character file cut at 24,870, the last line boundary below 25,000.
 *
 * Treated as a ceiling that may be wrong in the unsafe direction. See
 * {@link DEFAULT_BUDGET} for the margin actually enforced.
 */
export const INFERRED_INJECTION_CAP = 25_000;

/**
 * What the guard actually enforces: the inferred cap less a 10% margin.
 *
 * Deliberately below {@link INFERRED_INJECTION_CAP}. If the real limit turns out
 * lower than inferred, the margin still catches the file before anything is lost;
 * if it turns out higher, the cost is a warning slightly early. The asymmetry is
 * the point — one direction loses memories silently, the other is mildly noisy.
 *
 * Override with `OPENTHROTTLE_MEMORY_INDEX_BUDGET` when the real cap is known.
 */
export const DEFAULT_BUDGET = Math.floor(INFERRED_INJECTION_CAP * 0.9);

/** One `- [Title](file.md) — hook` line in the index. */
export interface IndexEntry {
  /** Target of the markdown link, e.g. `no-attribution-guard-plan.md`. */
  readonly file: string;
  /** 1-based line number in the index. */
  readonly line: number;
  /** Character offset at which this entry's line ends (inclusive of newline). */
  readonly offsetEnd: number;
  /** Link text, e.g. `No-attribution guard plan`. */
  readonly title: string;
}

export interface BudgetReport {
  /** Budget the measurement was taken against, in characters. */
  readonly budget: number;
  /** Entries that would survive injection. */
  readonly kept: readonly IndexEntry[];
  /**
   * Entries that would be silently invisible — the whole point of the report.
   * Empty when the file fits.
   */
  readonly lost: readonly IndexEntry[];
  /** True when the file exceeds the budget. */
  readonly overBudget: boolean;
  /** How far over the budget, in characters. Zero when within it. */
  readonly overBy: number;
  /** Measured size in characters. */
  readonly size: number;
}

/** Matches an index pointer line: `- [Title](file.md) — hook`. */
const ENTRY_PATTERN = /^\s*[-*]\s*\[([^\]]*)\]\(([^)]*)\)/;

/**
 * Parse the index into its entries, recording where each one ends so the
 * truncation point can be mapped back to "these entries are gone".
 */
export const parseIndexEntries = (content: string): readonly IndexEntry[] => {
  const entries: IndexEntry[] = [];
  const lines = content.split('\n');
  let offset = 0;

  for (const [index, text] of lines.entries()) {
    // +1 for the newline `split` removed. The final line may not have one, which
    // only ever overstates the offset of the last entry by a single character —
    // it cannot move an entry across the cut.
    const end = offset + text.length + 1;
    const match = ENTRY_PATTERN.exec(text);
    if (match) {
      entries.push({
        file: match[2] ?? '',
        line: index + 1,
        offsetEnd: end,
        title: match[1] ?? '',
      });
    }
    offset = end;
  }

  return entries;
};

/**
 * Reproduce the loader's cut: keep whole lines only, so the surviving prefix is
 * the longest one ending on a newline at or before the budget.
 */
const truncationOffset = (content: string, budget: number): number => {
  if (content.length <= budget) return content.length;
  const lastNewline = content.lastIndexOf('\n', budget);
  // A budget smaller than the first line leaves nothing whole to keep.
  return lastNewline === -1 ? 0 : lastNewline + 1;
};

/**
 * Measure an index against its budget and say precisely which entries would
 * become invisible.
 *
 * @param content - The full `MEMORY.md` text, as it would be written to disk.
 * @param budget - Character budget; defaults to {@link DEFAULT_BUDGET}.
 */
export const reportIndexBudget = (
  content: string,
  budget: number = DEFAULT_BUDGET,
): BudgetReport => {
  const size = measureIndex(content);
  const entries = parseIndexEntries(content);

  if (size <= budget) {
    return {
      budget,
      kept: entries,
      lost: [],
      overBudget: false,
      overBy: 0,
      size,
    };
  }

  const cut = truncationOffset(content, budget);
  const kept = entries.filter((entry) => entry.offsetEnd <= cut);
  const lost = entries.filter((entry) => entry.offsetEnd > cut);

  return {
    budget,
    kept,
    lost,
    overBudget: true,
    overBy: size - budget,
    size,
  };
};

/**
 * How many lost entries to name before summarising the rest.
 *
 * A badly over-budget index can put hundreds of entries past the cut, and a
 * message that long is skimmed rather than read — which would reintroduce the
 * silence by burying it. The newest entries are the ones that matter most, and
 * they are at the END of the list, so the tail is what gets named.
 */
const MAX_NAMED_LOST = 15;

/** Name the last {@link MAX_NAMED_LOST} lost entries, counting off any earlier ones. */
const formatLostEntries = (lost: readonly IndexEntry[]): string => {
  if (lost.length === 0) {
    return '  (no index entries past the cut — the overflow is trailing prose)';
  }

  const named = lost.slice(-MAX_NAMED_LOST);
  const elided = lost.length - named.length;
  const lines = named.map(
    (entry) => `  - ${entry.title} (${entry.file})  [line ${entry.line}]`,
  );

  return elided > 0
    ? [
        `  …and ${elided} earlier ${elided === 1 ? 'entry' : 'entries'}, plus these ${named.length} newest:`,
        ...lines,
      ].join('\n')
    : lines.join('\n');
};

/**
 * Render the report as the message the author reads in the same turn as the
 * write. Names the entries that would go dark, because "the file is too big" is
 * the part they can already see — which entries vanish is the part they cannot.
 */
export const formatBudgetReport = (report: BudgetReport): string => {
  if (!report.overBudget) return '';

  const header = [
    `MEMORY.md is ${report.size} characters, ${report.overBy} over the ${report.budget}-character budget.`,
    'The harness does NOT reject an over-cap index — it truncates at the last whole',
    'line and injects the rest, so the write will appear to succeed and these entries',
    'will simply be absent from every future session:',
  ].join('\n');

  const lost = formatLostEntries(report.lost);

  const remedy = [
    '',
    'Entries are appended and eviction is positional, so the NEWEST memories are the',
    'ones lost. Fix before continuing — demote landed work to the archive, consolidate',
    'a workstream into one topic file, or delete what is re-derivable. Shortening hooks',
    'will not help: the binding constraint is entry count, not verbosity.',
  ].join('\n');

  return `${header}\n${lost}\n${remedy}`;
};
