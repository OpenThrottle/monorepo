/**
 * @description Unit tests for {@link mapParseTreeToIngestDraft}.
 */

import { describe, expect, test } from 'vitest';
import { DOCUMENT_UPLOAD_FORMATS } from '../cortex-document-parse/cortex-document-parse.types';
import { mapParseTreeToIngestDraft } from './cortex-document-ingest.mapper';

describe('mapParseTreeToIngestDraft', () => {
  describe('when the document has an H1 and H2 sections', () => {
    test('uses the first heading as plan title and splits H2 into tasks', () => {
      const draft = mapParseTreeToIngestDraft({
        blocks: [
          { kind: 'heading', level: 1, text: 'Ship ingest' },
          { kind: 'paragraph', text: 'Intro paragraph.' },
          { kind: 'heading', level: 2, text: 'Task A' },
          { depth: 0, kind: 'list_item', text: 'Req 1' },
          { kind: 'heading', level: 2, text: 'Task B' },
          { kind: 'paragraph', text: 'Details for B.' },
        ],
        format: DOCUMENT_UPLOAD_FORMATS.markdown,
      });

      expect(draft.planTitle).toBe('Ship ingest');
      expect(draft.proposedTasks).toHaveLength(2);
      expect(draft.proposedTasks[0]?.title).toBe('Task A');
      expect(draft.proposedTasks[0]?.requirements).toEqual(['Req 1']);
      expect(draft.proposedTasks[1]?.title).toBe('Task B');
      expect(draft.proposedTasks[1]?.description).toBe('Details for B.');
    });
  });

  describe('when there are no H2 headings', () => {
    test('returns a single fallback task from body content', () => {
      const draft = mapParseTreeToIngestDraft({
        blocks: [
          { kind: 'heading', level: 1, text: 'Only title' },
          { kind: 'paragraph', text: 'Body only.' },
        ],
        format: DOCUMENT_UPLOAD_FORMATS.markdown,
      });

      expect(draft.planTitle).toBe('Only title');
      expect(draft.proposedTasks).toHaveLength(1);
      expect(draft.proposedTasks[0]?.title).toBe('Imported task');
      expect(draft.proposedTasks[0]?.description).toBe('Body only.');
    });
  });

  describe('when there are no headings at all', () => {
    test('uses default plan title and fallback task', () => {
      const draft = mapParseTreeToIngestDraft({
        blocks: [{ kind: 'paragraph', text: 'Plain text.' }],
        format: DOCUMENT_UPLOAD_FORMATS.markdown,
      });

      expect(draft.planTitle).toBe('Imported document');
      expect(draft.proposedTasks).toHaveLength(1);
      expect(draft.proposedTasks[0]?.description).toBe('Plain text.');
    });
  });
});
