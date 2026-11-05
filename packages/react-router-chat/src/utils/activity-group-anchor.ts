import type { TurnTimelineActivityGroup } from '../turn-tool-groups';

/**
 * The sortOrder of an activity group's first step, used as its stable React key.
 * An empty group anchors at 0.
 */
export const activityGroupAnchor = (
  group: TurnTimelineActivityGroup,
): number => {
  const first = group.items[0];

  if (first === undefined) {
    return 0;
  }

  if (first.kind === 'tools') {
    return first.tools[0]?.sortOrder ?? 0;
  }

  return first.event.sortOrder;
};
