import { describe, expect, test } from 'vitest';
import { TimelineMarkerKind } from '../../config/kinds';
import type { TimelineMarker } from '../../types';
import { hasUnattributedGrilling } from '../attribution';

const marker = (
  id: string,
  kind: TimelineMarkerKind,
  userId: string | null,
): TimelineMarker => ({
  at: '2026-09-02T00:00:00.000Z',
  branch: 'feat/x',
  id,
  kind,
  laneKey: 'skills',
  laneLabel: 'Skills',
  planId: null,
  taskId: null,
  title: 'feat/x',
  url: null,
  userId,
});

describe('hasUnattributedGrilling', () => {
  test('should return false for an empty window', () => {
    expect(hasUnattributedGrilling([])).toBe(false);
  });

  test('should return true when a grilling marker carries no user', () => {
    expect(
      hasUnattributedGrilling([
        marker('marker-1', TimelineMarkerKind.Grilling, null),
      ]),
    ).toBe(true);
  });

  test('should return false when every grilling marker is attributed', () => {
    expect(
      hasUnattributedGrilling([
        marker('marker-1', TimelineMarkerKind.Grilling, 'user-1'),
        marker('marker-2', TimelineMarkerKind.Grilling, 'user-2'),
      ]),
    ).toBe(false);
  });

  test('should ignore non-grilling markers, which never carry a user', () => {
    expect(
      hasUnattributedGrilling([
        marker('marker-1', TimelineMarkerKind.GitCommit, null),
        marker('marker-2', TimelineMarkerKind.TaskAdded, null),
      ]),
    ).toBe(false);
  });

  test('should return true for a window mixing attributed and unattributed events', () => {
    expect(
      hasUnattributedGrilling([
        marker('marker-1', TimelineMarkerKind.Grilling, 'user-1'),
        marker('marker-2', TimelineMarkerKind.Grilling, null),
      ]),
    ).toBe(true);
  });
});
