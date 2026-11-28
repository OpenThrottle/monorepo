export const ATTACHMENTS_JANITOR_QUEUE_NAME = 'Attachments Janitor';

/** Env var holding how many days an unreferenced attachment file survives. */
export const ATTACHMENTS_RETENTION_DAYS_ENV_VAR = `OPENTHROTTLE_ATTACHMENTS_RETENTION_DAYS`;

export const DEFAULT_ATTACHMENTS_RETENTION_DAYS = 30;

export const MS_PER_HOUR = 60 * 60 * 1000;
export const MS_PER_DAY = 24 * MS_PER_HOUR;

/** An upload row never attached to a sent message is dropped after this long. */
export const UNLINKED_ROW_MAX_AGE_MS = 24 * MS_PER_HOUR;

/** A `.tmp-*` file older than this is the debris of a crashed write. */
export const STALE_TEMP_FILE_MAX_AGE_MS = MS_PER_HOUR;

/**
 * A `.turn-*` staging directory older than this is left by a crashed turn (a live turn removes
 * its own in a `finally`); well past the longest turn.
 */
export const STALE_TURN_DIR_MAX_AGE_MS = 24 * MS_PER_HOUR;

/** Files examined concurrently; keeps the stat/DB fan-out bounded. */
export const JANITOR_CHUNK_SIZE = 16;
