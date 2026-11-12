import { describe, expect, test } from 'vitest';

import { WorkspaceEditorId } from '~/__generated__/graphql';
import { orderEditorsDefaultFirst } from '~/global/utils/orderEditorsDefaultFirst';

const ENABLED = [
  WorkspaceEditorId.Claude,
  WorkspaceEditorId.Cursor,
  WorkspaceEditorId.Vscode,
];

describe('orderEditorsDefaultFirst', () => {
  describe('when no default is set', () => {
    test('returns the list unchanged', () => {
      expect(orderEditorsDefaultFirst(ENABLED, null)).toEqual(ENABLED);
    });
  });

  describe('when the default is enabled', () => {
    test('moves it to the front and keeps the rest in order', () => {
      expect(
        orderEditorsDefaultFirst(ENABLED, WorkspaceEditorId.Vscode),
      ).toEqual([
        WorkspaceEditorId.Vscode,
        WorkspaceEditorId.Claude,
        WorkspaceEditorId.Cursor,
      ]);
    });
  });

  describe('when the default is not enabled', () => {
    test('neither adds it nor reorders', () => {
      const enabled = [WorkspaceEditorId.Cursor, WorkspaceEditorId.Vscode];

      expect(
        orderEditorsDefaultFirst(enabled, WorkspaceEditorId.Claude),
      ).toEqual(enabled);
    });
  });
});
