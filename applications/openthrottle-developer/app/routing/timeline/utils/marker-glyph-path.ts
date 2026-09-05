/**
 * @description SVG path geometry for each marker glyph, centred on (0, 0) so a
 * caller only has to translate. One definition serves both the chart and the
 * legend — the plan is explicit that the two must not drift, and the only way
 * to guarantee that is for them to draw from the same function.
 *
 * Shapes, not just fills: colour alone fails for colour-blind viewers and is
 * unreadable once several markers cluster into a few pixels.
 */

import { TIMELINE_MARKER_GLYPH } from '../config/kinds';
import type { TimelineMarkerGlyph, TimelineMarkerKind } from '../config/kinds';

/** Path data for a glyph at the given radius, centred on the origin. */
export function markerGlyphPath(
  glyph: TimelineMarkerGlyph,
  radius: number,
): string {
  const r = radius;

  if (glyph === 'triangle') {
    return `M 0 ${-r} L ${r} ${r} L ${-r} ${r} Z`;
  }

  if (glyph === 'diamond') {
    return `M 0 ${-r} L ${r} 0 L 0 ${r} L ${-r} 0 Z`;
  }

  if (glyph === 'chevron') {
    return `M ${-r} ${-r} L 0 0 L ${-r} ${r} L ${-r * 0.3} ${r} L ${r * 0.4} 0 L ${-r * 0.3} ${-r} Z`;
  }

  if (glyph === 'bar') {
    return `M ${-r * 0.4} ${-r} L ${r * 0.4} ${-r} L ${r * 0.4} ${r} L ${-r * 0.4} ${r} Z`;
  }

  if (glyph === 'star') {
    return starPath(r);
  }

  // circle — drawn as two arcs so every glyph is one <path>, which keeps the
  // chart and the legend rendering the same element type.
  return `M ${-r} 0 A ${r} ${r} 0 1 0 ${r} 0 A ${r} ${r} 0 1 0 ${-r} 0 Z`;
}

/** Path for the glyph a marker kind maps to. */
export function markerKindPath(
  kind: TimelineMarkerKind,
  radius: number,
): string {
  return markerGlyphPath(TIMELINE_MARKER_GLYPH[kind], radius);
}

/** Five-pointed star, inner radius at 45% — grilling's glyph. */
const starPath = (r: number): string => {
  const points: string[] = [];

  for (let index = 0; index < 10; index += 1) {
    const radius = index % 2 === 0 ? r : r * 0.45;
    // Start at the top rather than at 0 radians, so the star points up.
    const angle = (Math.PI / 5) * index - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    points.push(`${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`);
  }

  return `${points.join(' ')} Z`;
};
