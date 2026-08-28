/**
 * @description Covers the client-side editor ids derived from the generated enum.
 */

import { describe, expect, it } from 'vitest';

import {
  isWorkspaceEditorId,
  WORKSPACE_EDITOR_IDS,
} from '../workspace-editors';
import { WorkspaceEditorId } from '~/__generated__/graphql';

describe('workspace editor ids', () => {
  it('covers every member of the generated enum, without re-listing them', () => {
    expect([...WORKSPACE_EDITOR_IDS].sort()).toEqual(
      Object.values(WorkspaceEditorId).sort(),
    );
  });

  describe('isWorkspaceEditorId', () => {
    it('accepts every generated editor id', () => {
      for (const editor of Object.values(WorkspaceEditorId)) {
        expect(isWorkspaceEditorId(editor)).toBe(true);
      }
    });

    it('rejects an unknown editor', () => {
      expect(isWorkspaceEditorId('SUBLIME')).toBe(false);
    });

    it('rejects the lowercase server-side form', () => {
      // The wire values are SCREAMING (`CURSOR`); the server-side ids are lowercase
      // (`cursor`). Two distinct string sets bridged by GraphQL — never conflate them.
      expect(isWorkspaceEditorId('cursor')).toBe(false);
    });

    it('rejects an empty string', () => {
      expect(isWorkspaceEditorId('')).toBe(false);
    });
  });
});
