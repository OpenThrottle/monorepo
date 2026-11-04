import { describe, expect, test } from 'vitest';

import { resolvePromptRecall } from '../prompt-recall';

const history = ['first', 'line one\nline two', 'latest'];

describe('resolvePromptRecall', () => {
  describe('when the draft is empty', () => {
    test('older recalls the latest prompt', () => {
      expect(
        resolvePromptRecall({
          direction: 'older',
          draft: '',
          history,
          recallIndex: null,
          selectionEnd: 0,
          selectionStart: 0,
        }),
      ).toEqual({ index: 2, value: 'latest' });
    });

    test('newer keeps native behavior', () => {
      expect(
        resolvePromptRecall({
          direction: 'newer',
          draft: '',
          history,
          recallIndex: null,
          selectionEnd: 0,
          selectionStart: 0,
        }),
      ).toBeNull();
    });

    test('returns null without history', () => {
      expect(
        resolvePromptRecall({
          direction: 'older',
          draft: '',
          history: [],
          recallIndex: null,
          selectionEnd: 0,
          selectionStart: 0,
        }),
      ).toBeNull();
    });
  });

  describe('when the draft is an unedited recalled prompt', () => {
    test('older steps back from the first line', () => {
      expect(
        resolvePromptRecall({
          direction: 'older',
          draft: 'line one\nline two',
          history,
          recallIndex: 1,
          selectionEnd: 3,
          selectionStart: 3,
        }),
      ).toEqual({ index: 0, value: 'first' });
    });

    test('older keeps native behavior below the first line', () => {
      expect(
        resolvePromptRecall({
          direction: 'older',
          draft: 'line one\nline two',
          history,
          recallIndex: 1,
          selectionEnd: 12,
          selectionStart: 12,
        }),
      ).toBeNull();
    });

    test('older keeps native behavior at the oldest prompt', () => {
      expect(
        resolvePromptRecall({
          direction: 'older',
          draft: 'first',
          history,
          recallIndex: 0,
          selectionEnd: 0,
          selectionStart: 0,
        }),
      ).toBeNull();
    });

    test('newer steps forward from the last line', () => {
      expect(
        resolvePromptRecall({
          direction: 'newer',
          draft: 'line one\nline two',
          history,
          recallIndex: 1,
          selectionEnd: 12,
          selectionStart: 12,
        }),
      ).toEqual({ index: 2, value: 'latest' });
    });

    test('newer keeps native behavior above the last line', () => {
      expect(
        resolvePromptRecall({
          direction: 'newer',
          draft: 'line one\nline two',
          history,
          recallIndex: 1,
          selectionEnd: 2,
          selectionStart: 2,
        }),
      ).toBeNull();
    });

    test('newer past the latest prompt clears the draft', () => {
      expect(
        resolvePromptRecall({
          direction: 'newer',
          draft: 'latest',
          history,
          recallIndex: 2,
          selectionEnd: 6,
          selectionStart: 6,
        }),
      ).toEqual({ index: null, value: '' });
    });

    test('a selection range keeps native behavior', () => {
      expect(
        resolvePromptRecall({
          direction: 'older',
          draft: 'latest',
          history,
          recallIndex: 2,
          selectionEnd: 6,
          selectionStart: 0,
        }),
      ).toBeNull();
    });
  });

  describe('when the draft was typed or edited', () => {
    test('returns null', () => {
      expect(
        resolvePromptRecall({
          direction: 'older',
          draft: 'latest!',
          history,
          recallIndex: 2,
          selectionEnd: 0,
          selectionStart: 0,
        }),
      ).toBeNull();
    });
  });
});
