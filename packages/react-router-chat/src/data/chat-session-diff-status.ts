import { ArrowRightLeft, FileMinus, FilePen, FilePlus } from 'lucide-react';

import type { ChatSessionDiffFileStatus } from '../types';

/** Icon for each file status in the session drawer's Changes section. */
export const SESSION_DIFF_STATUS_ICONS = {
  added: FilePlus,
  deleted: FileMinus,
  modified: FilePen,
  renamed: ArrowRightLeft,
} as const satisfies Record<ChatSessionDiffFileStatus, unknown>;

/** Theme-token text tone for each status (no raw colors). */
export const SESSION_DIFF_STATUS_TONES = {
  added: 'text-success',
  deleted: 'text-destructive',
  modified: 'text-muted-foreground',
  renamed: 'text-muted-foreground',
} as const satisfies Record<ChatSessionDiffFileStatus, string>;

export type SessionDiffStatusTonesKey = keyof typeof SESSION_DIFF_STATUS_TONES;
export type SessionDiffStatusTonesValue =
  (typeof SESSION_DIFF_STATUS_TONES)[SessionDiffStatusTonesKey];
