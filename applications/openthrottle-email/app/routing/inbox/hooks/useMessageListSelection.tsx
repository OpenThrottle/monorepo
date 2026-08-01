import * as React from 'react';
import { toast } from '@openthrottle/react-router-shadcn';
import type { MailMessageSummary } from '~/types/mail';

/** Options for {@link useMessageListSelection}. */
export interface UseMessageListSelectionOptions {
  readonly messages: readonly MailMessageSummary[];
  /** Called when selection changes. Enables select-all and per-row checkboxes when provided. */
  readonly onSelectionChange?: (ids: Set<string>) => void;
  /** Controlled selected message ids for bulk actions. */
  readonly selectedIds?: ReadonlySet<string>;
}

/** Return value of {@link useMessageListSelection}. */
export interface UseMessageListSelectionResult {
  readonly handleBulkDeleteConfirm: () => void;
  readonly handleCancelBulkDelete: () => void;
  readonly handleRequestBulkDelete: () => void;
  readonly handleSelectAll: (checked: boolean) => void;
  readonly handleSelectOne: (id: string, checked: boolean) => void;
  readonly hasSelection: boolean;
  readonly isAllSelected: boolean;
  readonly selectAllRef: React.RefObject<HTMLInputElement | null>;
  readonly selectedSet: ReadonlySet<string>;
  readonly showDeleteConfirm: boolean;
}

/**
 * @description Owns the {@link MessageList} selection behavior: select-all /
 * per-row toggles (with the indeterminate header checkbox), and the bulk
 * delete confirm flow.
 */
export const useMessageListSelection = (
  options: UseMessageListSelectionOptions,
): UseMessageListSelectionResult => {
  const { messages, onSelectionChange, selectedIds } = options;

  // Hooks
  const selectAllRef = React.useRef<HTMLInputElement | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  // Setup
  const selectedSet = selectedIds ?? new Set<string>();
  const hasSelection = selectedSet.size > 0;
  const isAllSelected =
    messages.length > 0 && messages.every((m) => selectedSet.has(m.id));
  const isSomeSelected = messages.some((m) => selectedSet.has(m.id));

  // Handlers
  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    onSelectionChange(checked ? new Set(messages.map((m) => m.id)) : new Set());
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (!onSelectionChange) return;
    const next = new Set(selectedSet);
    if (checked) next.add(id);
    else next.delete(id);
    onSelectionChange(next);
  };

  const handleBulkDeleteConfirm = React.useCallback(() => {
    // Wire to delete/move-to-trash API when backend exists; for now clear selection and toast.
    onSelectionChange?.(new Set());
    setShowDeleteConfirm(false);
    toast.success(`${selectedSet.size} message(s) moved to trash`);
  }, [onSelectionChange, selectedSet.size]);

  const handleRequestBulkDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleCancelBulkDelete = () => {
    setShowDeleteConfirm(false);
  };

  // Markup

  // Life Cycle
  React.useEffect(() => {
    const el = selectAllRef.current;
    if (el) el.indeterminate = isSomeSelected && !isAllSelected;
  }, [isSomeSelected, isAllSelected]);

  // 🔌 Short Circuit

  return {
    handleBulkDeleteConfirm,
    handleCancelBulkDelete,
    handleRequestBulkDelete,
    handleSelectAll,
    handleSelectOne,
    hasSelection,
    isAllSelected,
    selectAllRef,
    selectedSet,
    showDeleteConfirm,
  };
};
