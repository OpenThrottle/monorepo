/**
 * Table classes that let the wide text column take the remaining width and truncate, instead of
 * sizing the table to its longest title (`w-full max-w-0` on that column's cells).
 */
export const SEARCH_RESULTS_TABLE_CLASS = `[&_td:nth-child(2)]:w-full [&_td:nth-child(2)]:max-w-0`;

export const SEARCH_CODE_TABLE_CLASS = `[&_td:nth-child(1)]:w-full [&_td:nth-child(1)]:max-w-0`;
