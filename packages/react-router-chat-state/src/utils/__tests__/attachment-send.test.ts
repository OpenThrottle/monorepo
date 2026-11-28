import { describe, expect, test } from 'vitest';

import { CHAT_ATTACHMENT_COPY } from '../../data/copy';
import {
  buildAttachmentFields,
  getAttachmentsDisabledReason,
  getAttachmentSendBlocker,
} from '../attachment-send';

describe('getAttachmentsDisabledReason', () => {
  describe('when the model accepts images', () => {
    test('is undefined', () => {
      expect(getAttachmentsDisabledReason(true)).toBeUndefined();
    });
  });

  describe('when the model does not accept images', () => {
    test('is the unsupported-model copy', () => {
      expect(getAttachmentsDisabledReason(false)).toBe(
        CHAT_ATTACHMENT_COPY.unsupportedModel,
      );
    });
  });
});

describe('getAttachmentSendBlocker', () => {
  describe('when an upload is still running', () => {
    test('blocks with the uploading copy, even on a text-only model', () => {
      expect(
        getAttachmentSendBlocker({
          acceptsImages: false,
          attachmentIds: ['a'],
          hasUploading: true,
        }),
      ).toBe(CHAT_ATTACHMENT_COPY.uploadingBlocker);
    });
  });

  describe('when images are attached to a model that rejects them', () => {
    test('blocks with the unsupported-model copy', () => {
      expect(
        getAttachmentSendBlocker({
          acceptsImages: false,
          attachmentIds: ['a'],
          hasUploading: false,
        }),
      ).toBe(CHAT_ATTACHMENT_COPY.unsupportedModel);
    });
  });

  describe('when nothing is attached to a text-only model', () => {
    test('does not block', () => {
      expect(
        getAttachmentSendBlocker({
          acceptsImages: false,
          attachmentIds: [],
          hasUploading: false,
        }),
      ).toBeUndefined();
    });
  });

  describe('when images are attached to an image-capable model', () => {
    test('does not block', () => {
      expect(
        getAttachmentSendBlocker({
          acceptsImages: true,
          attachmentIds: ['a', 'b'],
          hasUploading: false,
        }),
      ).toBeUndefined();
    });
  });
});

describe('buildAttachmentFields', () => {
  test('is empty with no attachments', () => {
    expect(buildAttachmentFields([])).toEqual({});
  });

  test('carries the ids as a JSON array', () => {
    expect(buildAttachmentFields(['a', 'b'])).toEqual({
      attachmentIds: '["a","b"]',
    });
  });
});
