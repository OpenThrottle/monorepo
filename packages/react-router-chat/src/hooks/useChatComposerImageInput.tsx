import * as React from 'react';

import { hasDraggedFiles, pickImageFiles } from '../utils/chat-attachments';

export interface UseChatComposerImageInputOptions {
  /** Ignore paste and drop entirely (composer disabled / read-only / no reason-free attach). */
  readonly disabled: boolean;
  readonly onAddFiles: ((files: readonly File[]) => void) | undefined;
}

export interface UseChatComposerImageInputResult {
  readonly isDragging: boolean;
  readonly onDragLeave: (event: React.DragEvent<HTMLElement>) => void;
  readonly onDragOver: (event: React.DragEvent<HTMLElement>) => void;
  readonly onDrop: (event: React.DragEvent<HTMLElement>) => void;
  readonly onPaste: (event: React.ClipboardEvent<HTMLElement>) => void;
}

/**
 * @description Paste and drag-and-drop handling for the composer's image
 * attachments. Presentational: image files are handed to `onAddFiles`; a paste
 * that also carries text is left alone so spreadsheet copies still paste text.
 */
export const useChatComposerImageInput = (
  options: UseChatComposerImageInputOptions,
): UseChatComposerImageInputResult => {
  const { disabled, onAddFiles } = options;

  // Hooks
  const [isDragging, setIsDragging] = React.useState(false);

  // Setup
  const isActive = !disabled && onAddFiles !== undefined;

  // Handlers
  const onDragOver = (event: React.DragEvent<HTMLElement>): void => {
    if (!isActive || !hasDraggedFiles(event.dataTransfer)) {
      return;
    }
    event.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = (event: React.DragEvent<HTMLElement>): void => {
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) {
      return;
    }
    setIsDragging(false);
  };
  const onDrop = (event: React.DragEvent<HTMLElement>): void => {
    setIsDragging(false);
    if (!isActive || !hasDraggedFiles(event.dataTransfer)) {
      return;
    }
    event.preventDefault();
    const files = pickImageFiles(Array.from(event.dataTransfer.files));
    if (files.length > 0) {
      onAddFiles(files);
    }
  };
  const onPaste = (event: React.ClipboardEvent<HTMLElement>): void => {
    if (!isActive || event.clipboardData.getData('text/plain') !== '') {
      return;
    }
    const files = pickImageFiles(Array.from(event.clipboardData.files));
    if (files.length === 0) {
      return;
    }
    event.preventDefault();
    onAddFiles(files);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return { isDragging, onDragLeave, onDragOver, onDrop, onPaste };
};
