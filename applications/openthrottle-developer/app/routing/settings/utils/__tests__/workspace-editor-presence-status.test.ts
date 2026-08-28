import { describe, expect, test } from 'vitest';
import {
  EditorPresenceState,
  WorkspaceEditorId,
} from '~/__generated__/graphql';
import {
  WORKSPACE_EDITOR_PRESENCE_STATUS,
  buildEditorPresenceIndex,
  getEditorPresenceStatus,
  readEditorPresence,
} from '../workspace-editor-presence-status';

describe('WORKSPACE_EDITOR_PRESENCE_STATUS', () => {
  test('covers every presence state the schema declares', () => {
    for (const state of Object.values(EditorPresenceState)) {
      expect(WORKSPACE_EDITOR_PRESENCE_STATUS[state]).toBeDefined();
    }

    expect(Object.keys(WORKSPACE_EDITOR_PRESENCE_STATUS)).toHaveLength(
      Object.values(EditorPresenceState).length,
    );
  });

  test('gives the three states distinct tones so consumers can branch on claim strength', () => {
    expect(
      WORKSPACE_EDITOR_PRESENCE_STATUS[EditorPresenceState.Installed].tone,
    ).toBe('positive');
    expect(
      WORKSPACE_EDITOR_PRESENCE_STATUS[EditorPresenceState.NotFound].tone,
    ).toBe('muted');
    // Neutral is what makes UNKNOWN skippable everywhere without knowing the palette.
    expect(
      WORKSPACE_EDITOR_PRESENCE_STATUS[EditorPresenceState.Unknown].tone,
    ).toBe('neutral');
  });

  test('gives the three states distinct icons and labels', () => {
    const descriptors = Object.values(WORKSPACE_EDITOR_PRESENCE_STATUS);
    const labels = descriptors.map((descriptor) => descriptor.label);
    const icons = descriptors.map((descriptor) => descriptor.icon);

    expect(new Set(labels).size).toBe(descriptors.length);
    expect(new Set(icons).size).toBe(descriptors.length);
  });

  test('builds a screen-reader sentence naming the editor', () => {
    expect(
      WORKSPACE_EDITOR_PRESENCE_STATUS[EditorPresenceState.Installed].srLabel(
        'Cursor',
      ),
    ).toBe('Cursor was detected on this machine');
    expect(
      WORKSPACE_EDITOR_PRESENCE_STATUS[EditorPresenceState.NotFound].srLabel(
        'Visual Studio Code',
      ),
    ).toBe('Visual Studio Code was not detected on this machine');
  });
});

describe('getEditorPresenceStatus', () => {
  test('reads the same descriptor as the map', () => {
    expect(getEditorPresenceStatus(EditorPresenceState.NotFound)).toBe(
      WORKSPACE_EDITOR_PRESENCE_STATUS[EditorPresenceState.NotFound],
    );
  });
});

describe('buildEditorPresenceIndex', () => {
  test('indexes every probed editor by id', () => {
    const index = buildEditorPresenceIndex([
      {
        editor: WorkspaceEditorId.Cursor,
        presence: EditorPresenceState.Installed,
      },
      {
        editor: WorkspaceEditorId.Vscode,
        presence: EditorPresenceState.NotFound,
      },
    ]);

    expect(index.get(WorkspaceEditorId.Cursor)).toBe(
      EditorPresenceState.Installed,
    );
    expect(index.get(WorkspaceEditorId.Vscode)).toBe(
      EditorPresenceState.NotFound,
    );
  });

  test('tolerates null and undefined — the failed-query path', () => {
    expect(buildEditorPresenceIndex(null).size).toBe(0);
    expect(buildEditorPresenceIndex(undefined).size).toBe(0);
    expect(buildEditorPresenceIndex().size).toBe(0);
  });

  test('keeps the last entry when the probe repeats an editor', () => {
    const index = buildEditorPresenceIndex([
      {
        editor: WorkspaceEditorId.Cursor,
        presence: EditorPresenceState.NotFound,
      },
      {
        editor: WorkspaceEditorId.Cursor,
        presence: EditorPresenceState.Installed,
      },
    ]);

    expect(index.get(WorkspaceEditorId.Cursor)).toBe(
      EditorPresenceState.Installed,
    );
  });
});

describe('readEditorPresence', () => {
  test('reports UNKNOWN for an editor the probe never covered', () => {
    const index = buildEditorPresenceIndex([
      {
        editor: WorkspaceEditorId.Cursor,
        presence: EditorPresenceState.Installed,
      },
    ]);

    expect(readEditorPresence(index, WorkspaceEditorId.Vscode)).toBe(
      EditorPresenceState.Unknown,
    );
    expect(readEditorPresence(index, WorkspaceEditorId.Claude)).toBe(
      EditorPresenceState.Unknown,
    );
  });

  test('reports UNKNOWN when there is no index at all', () => {
    expect(readEditorPresence(null, WorkspaceEditorId.Cursor)).toBe(
      EditorPresenceState.Unknown,
    );
    expect(readEditorPresence(undefined, WorkspaceEditorId.Cursor)).toBe(
      EditorPresenceState.Unknown,
    );
  });

  test('reads a probed state back out', () => {
    const index = buildEditorPresenceIndex([
      {
        editor: WorkspaceEditorId.Claude,
        presence: EditorPresenceState.Installed,
      },
    ]);

    expect(readEditorPresence(index, WorkspaceEditorId.Claude)).toBe(
      EditorPresenceState.Installed,
    );
  });
});
