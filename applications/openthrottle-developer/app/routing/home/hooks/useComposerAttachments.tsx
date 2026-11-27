import { CHAT_ATTACHMENT_MAX_COUNT } from '@openthrottle/react-router-chat';
import * as React from 'react';

import { HOME_ATTACHMENT_COPY } from '~/routing/home/data/copy';
import type { ComposerAttachmentEntry } from '~/routing/home/types';
import { uploadComposerAttachment } from '~/routing/home/utils/uploadComposerAttachment';

export interface UseComposerAttachmentsResult {
  readonly addFiles: (files: readonly File[]) => void;
  /** Server ids of the uploaded images, in attach order. */
  readonly attachmentIds: readonly string[];
  /** Drops every chip (after a send) and revokes their preview URLs. */
  readonly clear: () => void;
  readonly entries: readonly ComposerAttachmentEntry[];
  readonly hasUploading: boolean;
  readonly remove: (localId: string) => void;
}

/**
 * @description The home composer's image attachments: for each added file it
 * makes a preview object URL, uploads it to `/resources/attachments`, and tracks
 * uploading / ready / error per chip. Preview URLs are revoked on remove, on
 * clear and on unmount. An upload that finishes after its chip was removed is
 * ignored.
 */
export const useComposerAttachments = (): UseComposerAttachmentsResult => {
  // Hooks
  const [entries, setEntries] = React.useState<
    readonly ComposerAttachmentEntry[]
  >([]);
  const entriesRef = React.useRef(entries);
  const counterRef = React.useRef(0);

  // Setup
  entriesRef.current = entries;
  const attachmentIds = entries.flatMap((entry) => {
    return entry.status === 'ready' ? [entry.attachmentId] : [];
  });
  const hasUploading = entries.some((entry) => entry.status === 'uploading');

  // Handlers
  const settle = (
    localId: string,
    next: (entry: ComposerAttachmentEntry) => ComposerAttachmentEntry,
  ): void => {
    setEntries((previous) => {
      return previous.map((entry) => {
        return entry.localId === localId ? next(entry) : entry;
      });
    });
  };

  const upload = async (localId: string, file: File): Promise<void> => {
    const result = await uploadComposerAttachment(file);
    settle(localId, (entry) => {
      if (!result.ok) {
        return {
          error: result.error,
          localId,
          name: entry.name,
          previewUrl: entry.previewUrl,
          status: 'error',
        };
      }

      return {
        attachmentId: result.id,
        localId,
        name: entry.name,
        previewUrl: entry.previewUrl,
        status: 'ready',
      };
    });
  };

  const addFiles = (files: readonly File[]): void => {
    const room = Math.max(CHAT_ATTACHMENT_MAX_COUNT - entriesRef.current.length, 0); // prettier-ignore
    const added = files.map((file, index): ComposerAttachmentEntry => {
      counterRef.current += 1;
      const base = {
        localId: `attachment-${counterRef.current}`,
        name: file.name,
        previewUrl: URL.createObjectURL(file),
      };
      if (index >= room) {
        return {
          ...base,
          error: HOME_ATTACHMENT_COPY.tooMany,
          status: 'error',
        };
      }
      void upload(base.localId, file);

      return { ...base, status: 'uploading' };
    });
    setEntries((previous) => [...previous, ...added]);
  };

  const remove = (localId: string): void => {
    const target = entriesRef.current.find(
      (entry) => entry.localId === localId,
    );
    if (target !== undefined) {
      URL.revokeObjectURL(target.previewUrl);
    }
    setEntries((previous) => {
      return previous.filter((entry) => entry.localId !== localId);
    });
  };

  const clear = (): void => {
    for (const entry of entriesRef.current) {
      URL.revokeObjectURL(entry.previewUrl);
    }
    setEntries([]);
  };

  // Markup

  // Life Cycle
  React.useEffect(() => {
    return () => {
      for (const entry of entriesRef.current) {
        URL.revokeObjectURL(entry.previewUrl);
      }
    };

    // 🪝 Revoke any live preview URLs when the composer unmounts.
  }, []);

  // 🔌 Short Circuit

  return { addFiles, attachmentIds, clear, entries, hasUploading, remove };
};
