/**
 * @description Fixed pixel geometry for the timeline chart. Kept in one place
 * because the gutter, the axis and the lane bodies all have to agree — a lane
 * label that drifts from its lane by even a few pixels reads as a bug.
 */

/** Height of one lane sub-row. A lane is this times its sub-row count. */
export const TIMELINE_LANE_ROW_HEIGHT = 28;

/** Height of a span bar inside its sub-row, leaving a little breathing room. */
export const TIMELINE_SPAN_HEIGHT = 16;

/** Minimum rendered width of a span, so a one-second run is still clickable. */
export const TIMELINE_MIN_SPAN_WIDTH = 3;

/** Marker glyph size, in px. */
export const TIMELINE_MARKER_SIZE = 9;

/**
 * Markers closer together than this are bucketed into one cluster glyph. Below
 * roughly this distance the glyphs overlap and stop being separately readable,
 * so drawing them individually costs DOM nodes and buys nothing.
 */
export const TIMELINE_MARKER_COLLISION_PX = 10;
