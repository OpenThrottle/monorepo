/**
 * @description Formatting and grouping helpers for the plan/task output stream.
 * The stream is the surface a user stares at while an agent works (and the one
 * the screencast pipeline records), so the per-chunk header has to stay on a
 * single short line: a compact local `HH:mm:ss` next to the iteration, with the
 * calendar day hoisted to a separator that only repeats when the day changes.
 * The full timestamp survives as a `title`/`dateTime` value rather than as
 * rendered text — previously the raw `String(date)` reached the DOM and a
 * one-line log message carried a two-line header longer than the message.
 */
import { format, isSameDay } from 'date-fns';

/**
 * @description Minimal structural shape shared by the plan- and task-scoped
 * generated chunk types, so one renderer serves both without casting.
 */
export interface OutputStreamChunk {
  content: string;
  createdAt: unknown;
  id: string;
  iteration?: number | null;
}

export interface OutputStreamChunkDay {
  /** Chunks written on this day, in the order the stream delivered them. */
  chunks: OutputStreamChunk[];
  /**
   * Human-readable day heading, e.g. `Wed, Aug 19, 2026`; null when the chunks'
   * timestamps do not parse, so the caller supplies its own fallback copy.
   */
  label: string | null;
}

/**
 * @description Coerces a value the `Date` constructor accepts (string / number /
 * Date) into a valid Date, or null when it is not date-like or parses invalid.
 */
function toValidDate(value: unknown): Date | null {
  if (
    typeof value !== 'string' &&
    typeof value !== 'number' &&
    !(value instanceof Date)
  ) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * @description Compact local wall-clock time (`13:16:45`) for a chunk header.
 * Returns null when the timestamp is missing or unparseable, so the caller can
 * omit the `<time>` element instead of printing `Invalid Date`.
 */
export function formatChunkTime(value: unknown): string | null {
  const date = toValidDate(value);

  return date === null ? null : format(date, 'HH:mm:ss');
}

/**
 * @description Full local timestamp (`Aug 19, 2026 at 1:16:45 PM`) for the
 * header's `title` — the detail stays one hover away rather than on screen.
 */
export function formatChunkTimestamp(value: unknown): string | null {
  const date = toValidDate(value);

  return date === null ? null : format(date, "MMM d, yyyy 'at' h:mm:ss a");
}

/**
 * @description ISO string for a `<time dateTime>` attribute, or null when the
 * value is not a usable date.
 */
export function toChunkDateTimeAttribute(value: unknown): string | null {
  const date = toValidDate(value);

  return date === null ? null : date.toISOString();
}

/**
 * @description Day heading for a chunk (`Wed, Aug 19, 2026`), or null when the
 * timestamp is unusable.
 */
export function formatChunkDay(value: unknown): string | null {
  const date = toValidDate(value);

  return date === null ? null : format(date, 'EEE, MMM d, yyyy');
}

/**
 * @description Groups chunks into consecutive runs that share a calendar day so
 * the day is rendered once per run instead of once per chunk. Chunks whose
 * timestamp will not parse group together with a null label rather than being
 * dropped — output is never silently hidden.
 */
export function groupChunksByDay(
  chunks: readonly OutputStreamChunk[],
): OutputStreamChunkDay[] {
  const groups: OutputStreamChunkDay[] = [];
  let currentDate: Date | null = null;

  for (const chunk of chunks) {
    const date = toValidDate(chunk.createdAt);
    const previous = groups.at(-1);
    const continuesGroup =
      previous !== undefined &&
      (date === null
        ? currentDate === null
        : currentDate !== null && isSameDay(date, currentDate));

    if (continuesGroup) {
      previous.chunks.push(chunk);
    } else {
      groups.push({ chunks: [chunk], label: formatChunkDay(chunk.createdAt) });
    }

    currentDate = date;
  }

  return groups;
}
