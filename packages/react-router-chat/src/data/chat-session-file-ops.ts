import { FileMinus, FilePen, FilePlus } from 'lucide-react';

import type { SessionFileOp } from '../utils/deriveSessionFiles';

/** Icon for each Files-touched op in the session drawer. */
export const SESSION_FILE_OP_ICONS = {
  created: FilePlus,
  deleted: FileMinus,
  edited: FilePen,
} as const satisfies Record<SessionFileOp, unknown>;

/** Theme-token text tone for each op (also used for the +/- counts). */
export const SESSION_FILE_OP_TONES = {
  created: 'text-success',
  deleted: 'text-destructive',
  edited: 'text-muted-foreground',
} as const satisfies Record<SessionFileOp, string>;

export type SessionFileOpTonesKey = keyof typeof SESSION_FILE_OP_TONES;
export type SessionFileOpTonesValue =
  (typeof SESSION_FILE_OP_TONES)[SessionFileOpTonesKey];
