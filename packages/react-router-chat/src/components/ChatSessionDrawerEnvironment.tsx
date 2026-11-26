import { Bot, Cpu, FolderGit2, GitBranch, GitFork } from 'lucide-react';
import * as React from 'react';

import { PERMISSION_MODE_META } from '../data/chat-permission-mode-meta';
import { DEFAULT_REASONING_LABELS } from '../data/chat-reasoning-tier-labels';
import { CHAT_SESSION_DRAWER_COPY } from '../data/copy';
import type { ChatSessionEnvironment } from '../types';
import { CHAT_CHECKOUT_KIND } from '../types';
import { shortenCheckoutPath } from '../utils/checkout-display';

/** Fits the drawer's text column at `text-xs`; CSS `truncate` is the backstop. */
const PATH_MAX_CHARS = 32;

export interface ChatSessionDrawerEnvironmentProps {
  readonly environment: ChatSessionEnvironment | undefined;
}

interface EnvironmentRow {
  readonly detail: string | undefined;
  readonly icon: React.ComponentType<{ readonly className?: string }>;
  readonly key: string;
  readonly label: string;
  readonly title: string;
  readonly value: string;
}

/**
 * @description Body of the session drawer's Environment section: a read-only
 * list of what the conversation runs against (checkout, branch, model and
 * reasoning, permission mode, agent). Rows exist only for values the composer
 * reported.
 *
 * @public
 */
export const ChatSessionDrawerEnvironment = (
  props: ChatSessionDrawerEnvironmentProps,
): React.ReactElement => {
  const { environment } = props;

  // Hooks

  // Setup
  const copy = CHAT_SESSION_DRAWER_COPY.environment;
  const checkout = environment?.checkout;
  const path = checkout?.filesystemPath;
  const branch = checkout?.branch;
  const reasoning = environment?.reasoning;
  const permissionMode = environment?.permissionMode;
  const modelLabel = environment?.modelLabel;
  const agentLabel = environment?.agentLabel;
  const isWorktree = checkout?.kind === CHAT_CHECKOUT_KIND.worktree;
  const rows: EnvironmentRow[] = [];

  if (checkout != null) {
    const hasPath = path != null && path !== '';
    const shortPath = hasPath
      ? shortenCheckoutPath(path, PATH_MAX_CHARS)
      : undefined;
    rows.push({
      detail: shortPath,
      icon: isWorktree ? GitFork : FolderGit2,
      key: 'checkout',
      label: copy.checkout,
      title: path ?? checkout.label,
      value: checkout.label,
    });
  }
  if (branch != null && branch !== '') {
    rows.push({
      detail: undefined,
      icon: GitBranch,
      key: 'branch',
      label: copy.branch,
      title: branch,
      value: branch,
    });
  }
  if (modelLabel != null && modelLabel !== '') {
    const tier = reasoning != null ? DEFAULT_REASONING_LABELS[reasoning] : '';
    const value = tier !== '' ? `${modelLabel} · ${tier}` : modelLabel;
    rows.push({
      detail: undefined,
      icon: Cpu,
      key: 'model',
      label: copy.model,
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
      label: copy.permissions,
      title: meta.description,
      value: meta.label,
    });
  }
  if (agentLabel != null && agentLabel !== '') {
    rows.push({
      detail: undefined,
      icon: Bot,
      key: 'agent',
      label: copy.agent,
      title: agentLabel,
      value: agentLabel,
    });
  }

  // Handlers

  // Markup
  const list = (
    <ul
      className="flex flex-col gap-2 px-4 pb-3"
      data-testid="ChatSessionDrawerEnvironment"
    >
      {rows.map((row) => {
        const Icon = row.icon;
        const detailNode = row.detail != null && (
          <p className="text-muted-foreground truncate">{row.detail}</p>
        );
        return (
          <li
            className="flex min-w-0 items-start gap-2 text-xs"
            data-testid={`ChatSessionDrawerEnvironment-${row.key}`}
            key={row.key}
          >
            <span
              aria-label={row.label}
              className="text-muted-foreground mt-0.5 shrink-0"
              role="img"
            >
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate" title={row.title}>
                {row.value}
              </p>
              {detailNode}
            </div>
          </li>
        );
      })}
    </ul>
  );
  const empty = (
    <p
      className="text-muted-foreground px-4 pb-3 text-xs"
      data-testid="ChatSessionDrawerEnvironment"
    >
      {copy.empty}
    </p>
  );

  // Life Cycle

  // 🔌 Short Circuit
  if (rows.length === 0) return empty;

  return list;
};
