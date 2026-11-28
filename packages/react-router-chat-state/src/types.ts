import type {
  ChatComposerAttachmentFailed,
  ChatComposerAttachmentReady,
  ChatComposerAttachmentUploading,
} from '@openthrottle/react-router-chat';

import type { ChatOptionsResponse } from './utils/chat-discovery-options';

/**
 * A client-side discovery-options cache (module-scope + sessionStorage) the host
 * app may provide so a warm mount reuses the last good `/resources/chat-options`
 * result. Optional — omit it and the controller always probes the route.
 * @public
 */
export interface HeaderChatOptionsCache {
  read(): ChatOptionsResponse | null;
  write(options: ChatOptionsResponse): void;
}

/**
 * Live per-agent runtime facts from agent-CLI discovery that refine a backend's
 * static capability descriptor: whether chat runs over ACP (`approvals`),
 * whether Supervised gates file edits (`editApprovals`), whether it accepts
 * image attachments (`imageInput`) and the agent's auth
 * status (`unauthenticated` | `authenticated` | `unknown`).
 * @public
 */
export interface ChatAgentRuntime {
  readonly approvals: boolean;
  readonly authStatus: string;
  readonly editApprovals: boolean;
  /** Whether the backend accepts image attachments (`imageInput` capability). */
  readonly imageInput: boolean;
}

/** An uploaded chip that also remembers the server id sent with the turn. @public */
export interface ComposerAttachmentReadyEntry extends ChatComposerAttachmentReady {
  readonly attachmentId: string;
}

/** One composer chip; assignable to the package's `ChatComposerAttachment`. @public */
export type ComposerAttachmentEntry =
  | ChatComposerAttachmentFailed
  | ChatComposerAttachmentUploading
  | ComposerAttachmentReadyEntry;
