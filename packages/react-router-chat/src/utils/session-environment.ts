import { fillTemplate } from '@openthrottle/nodejs-utils';
import { Bot, Cpu, FolderGit2, GitBranch, GitFork } from 'lucide-react';
import type * as React from 'react';

import { PERMISSION_MODE_META } from '../data/chat-permission-mode-meta';
import { DEFAULT_REASONING_LABELS } from '../data/chat-reasoning-tier-labels';
import type {
  SessionMcpStatusTonesKey,
  SessionMcpTone,
} from '../data/chat-session-mcp-status';
import { SESSION_MCP_STATUS_TONES } from '../data/chat-session-mcp-status';
import type { ChatMcpServer, ChatSessionEnvironment } from '../types';
import { CHAT_CHECKOUT_KIND } from '../types';
import {
  CHECKOUT_BRANCH_SOURCE,
  resolveCheckoutBranch,
} from './checkout-branch';
import { shortenCheckoutPath } from './checkout-display';

/**
 * @description Fits the drawer's text column at `text-xs`; CSS `truncate` is the backstop.
 */
const PATH_MAX_CHARS = 32;

/**
 * @description One row of the Environment section, keyed for stable test ids.
 */
export interface SessionEnvironmentRow {
  /** Muted second line (the shortened checkout path). */
  readonly detail: string | undefined;
  readonly icon: React.ComponentType<{ readonly className?: string }>;
  readonly key: string;
  readonly label: string;
  readonly title: string;
  readonly value: string;
}

/**
 * @description The row labels the caller supplies (the section's copy).
 */
export interface SessionEnvironmentLabels {
  readonly agent: string;
  readonly branch: string;
  /** Row value for a default branch not yet confirmed current; `{branch}` is replaced. */
  readonly branchDefault: string;
  readonly checkout: string;
  readonly model: string;
  readonly permissions: string;
}

/**
 * @description Build the Environment section's rows, in display order, from what the composer
 * reported: checkout, branch, model (with its reasoning tier), permission mode and agent.
 * A row exists only for a value that was reported; `headBranch` (the checkout's live branch)
 * wins over the composer's `checkout.branch`. When only the repository default is known the
 * value is labelled as such rather than shown as the current branch.
 */
export const buildEnvironmentRows = (
  environment: ChatSessionEnvironment | undefined,
  headBranch: string | undefined,
  labels: SessionEnvironmentLabels,
): readonly SessionEnvironmentRow[] => {
  const checkout = environment?.checkout;
  const path = checkout?.filesystemPath;
  const reportedBranch = resolveCheckoutBranch(checkout);
  const branch = headBranch ?? reportedBranch?.name;
  const isUnscannedDefault =
    headBranch == null &&
    reportedBranch?.source === CHECKOUT_BRANCH_SOURCE.default;
  const branchValue = isUnscannedDefault
    ? fillTemplate(labels.branchDefault, { branch: branch ?? '' })
    : (branch ?? '');
  const reasoning = environment?.reasoning;
  const permissionMode = environment?.permissionMode;
  const modelLabel = environment?.modelLabel;
  const agentLabel = environment?.agentLabel;
  const isWorktree = checkout?.kind === CHAT_CHECKOUT_KIND.worktree;
  const rows: SessionEnvironmentRow[] = [];

  if (checkout != null) {
    const hasPath = path != null && path !== '';
    const shortPath = hasPath
      ? shortenCheckoutPath(path, PATH_MAX_CHARS)
      : undefined;
    rows.push({
      detail: shortPath,
      icon: isWorktree ? GitFork : FolderGit2,
      key: 'checkout',
      label: labels.checkout,
      title: path ?? checkout.label,
      value: checkout.label,
    });
  }
  if (branch != null && branch !== '') {
    rows.push({
      detail: undefined,
      icon: GitBranch,
      key: 'branch',
      label: labels.branch,
      title: branchValue,
      value: branchValue,
    });
  }
  if (modelLabel != null && modelLabel !== '') {
    const tier = reasoning != null ? DEFAULT_REASONING_LABELS[reasoning] : '';
    const value = tier !== '' ? `${modelLabel} · ${tier}` : modelLabel;
    rows.push({
      detail: undefined,
      icon: Cpu,
      key: 'model',
      label: labels.model,
      title: value,
      value,
    });
  }
  if (permissionMode != null) {
    const meta = PERMISSION_MODE_META[permissionMode];
    rows.push({
      detail: undefined,
      icon: meta.icon,
      key: 'permissions',
      label: labels.permissions,
      title: meta.description,
      value: meta.label,
    });
  }
  if (agentLabel != null && agentLabel !== '') {
    rows.push({
      detail: undefined,
      icon: Bot,
      key: 'agent',
      label: labels.agent,
      title: agentLabel,
      value: agentLabel,
    });
  }

  return rows;
};

/**
 * @description One MCP server line of the Environment section.
 */
export interface SessionMcpRow {
  /** The status as shown: the section's copy for a known word, the raw word otherwise. */
  readonly label: string;
  readonly name: string;
  readonly tone: SessionMcpTone;
}

/**
 * @description The status words the section has copy and a tone for.
 */
export type SessionMcpKnownStatus = SessionMcpStatusTonesKey;

const isKnownMcpStatus = (status: string): status is SessionMcpKnownStatus => {
  return Object.hasOwn(SESSION_MCP_STATUS_TONES, status);
};

/**
 * @description Build the MCP server rows from what the CLI reported at session start, keeping
 * its order. A status without copy shows as the CLI wrote it, in the neutral tone.
 */
export const buildMcpServerRows = (
  servers: readonly ChatMcpServer[],
  statusLabels: Readonly<Record<SessionMcpKnownStatus, string>>,
): readonly SessionMcpRow[] => {
  return servers.map((server) => {
    if (isKnownMcpStatus(server.status)) {
      return {
        label: statusLabels[server.status],
        name: server.name,
        tone: SESSION_MCP_STATUS_TONES[server.status],
      };
    }

    return { label: server.status, name: server.name, tone: 'neutral' };
  });
};
