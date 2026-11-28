/**
 * Static copy for {@link ChatUsageLimitNotice}. Kept out of the component per
 * the repo's component/data split.
 * @public
 */
export const CHAT_USAGE_LIMIT_COPY = {
  limitReached: 'Usage limit reached',
  resetsPrefix: 'resets',
} as const;

/**
 * Copy for {@link ChatContextMeter}. `{used}`, `{window}` and `{percent}` are
 * replaced with the formatted values.
 * @public
 */
export const CHAT_CONTEXT_METER_COPY = {
  ariaLabel: 'Context window: {used} of {window} tokens used ({percent}%)',
  percentToken: '{percent}',
  title: 'Context window used by the last turn',
  usedToken: '{used}',
  windowToken: '{window}',
} as const;

/** Copy for {@link ChatDeniedActionsNotice}. */
export const CHAT_DENIED_ACTIONS_COPY = {
  hint: `The agent may have stopped early. Choose a broader permission mode to let it use these.`,
  prefix: 'Permission denied:',
} as const;

/** Copy for {@link ChatToolCall}. */
export const CHAT_TOOL_CALL_COPY = {
  noOutputReported: 'No output reported.',
  notRun: `Not run: the agent cancelled this call after a permission was refused.`,
  payloadTruncated: 'Output truncated when saved',
} as const;

/** @description The one `{branch}` template for a repository's default branch, read by the checkout rows and the session drawer. */
const BRANCH_DEFAULT_TEMPLATE = '{branch} (repo default)';

/** Copy for {@link ChatCheckoutSelectorRow}. */
export const CHAT_CHECKOUT_ROW_COPY = {
  branchDefault: BRANCH_DEFAULT_TEMPLATE,
  contextOnly: 'Context only',
  primary: 'Primary',
  worktree: 'Worktree',
} as const;

/** Copy for {@link ChatPermissionRequest}. */
export const CHAT_PERMISSION_REQUEST_COPY = {
  cancelled: 'Cancelled',
  heading: 'Permission requested',
  selectedPrefix: 'Answered:',
} as const;

/** Copy for {@link ChatPermissionModeControl}'s remember-my-choice opt-in. */
export const CHAT_PERMISSION_REMEMBER_COPY = {
  hint: `When off, Auto-accept edits and Full access reset to Supervised in each new session`,
  label: 'Remember my choice',
} as const;

/** Copy for {@link ChatComposer}'s queue-while-streaming affordance. */
export const CHAT_COMPOSER_QUEUE_COPY = {
  placeholder: 'Queue a follow-up — it sends when this reply finishes',
  submitLabel: 'Queue',
} as const;

/** Copy for {@link ChatQueuedMessages} and {@link ChatQueuedMessageRow}. */
export const CHAT_QUEUED_MESSAGES_COPY = {
  cancelEdit: 'Cancel',
  clear: 'Clear',
  edit: 'Edit queued message',
  editLabel: 'Queued message',
  heading: 'Queued',
  lostOnReload: 'Queued messages are not saved if you reload the page.',
  paused: 'Paused — nothing sends until you resume.',
  remove: 'Remove queued message',
  resume: 'Resume',
  save: 'Save',
  sendNow: 'Send now',
} as const;

/**
 * Clause templates for a folded tool group's sentence summary, e.g. "Ran 3
 * commands and edited 2 files". `{count}` is replaced with the number; `one`
 * is used for a count of 1. `otherOnly` replaces `other` when every tool in the
 * group is uncategorized, so the summary reads "Used 2 tools", not "Used 2
 * other tools".
 * @public
 */
export const CHAT_TOOL_SUMMARY_COPY = {
  clauses: {
    command: { many: 'ran {count} commands', one: 'ran 1 command' },
    edit: { many: 'edited {count} files', one: 'edited 1 file' },
    other: { many: 'used {count} other tools', one: 'used 1 other tool' },
    read: { many: 'read {count} files', one: 'read 1 file' },
    search: { many: 'ran {count} searches', one: 'ran 1 search' },
    web: { many: 'fetched {count} web pages', one: 'fetched 1 web page' },
  },
  conjunction: 'and',
  countToken: '{count}',
  empty: 'No tool calls',
  otherOnly: { many: 'used {count} tools', one: 'used 1 tool' },
  separator: ', ',
} as const;

/** Copy for {@link ChatSessionDrawer} and its sections. */
export const CHAT_SESSION_DRAWER_COPY = {
  changes: {
    baseFallback: 'base',
    binary: 'Binary file: no patch to show.',
    empty: 'No changes against {base}.',
    filesTruncated: 'More files changed than are listed.',
    loading: 'Loading changes…',
    loadingPatch: 'Loading patch…',
    nextFile: 'Next file',
    noCheckout: 'Pick a checkout to see its changes.',
    openInEditor: 'Open {path} in your editor',
    patchDialogCounts: '+{additions} −{deletions}',
    patchDialogPosition: '{index} of {total}',
    patchLabel: 'Patch for {path}',
    patchTruncated: 'Patch truncated: showing the first part.',
    previousFile: 'Previous file',
    refresh: 'Refresh changes',
    renamedFrom: 'Renamed from {path}',
    statuses: {
      added: 'Added',
      deleted: 'Deleted',
      modified: 'Modified',
      renamed: 'Renamed',
    },
    summary: '+{additions} −{deletions} across {files} vs {base}',
    touched: 'Touched in this chat',
    touchedHeading: 'Touched in this chat',
    touchedNoNetChange: 'Touched in this chat, no net change',
    unavailable: 'Changes are unavailable for this checkout.',
  },
  closeLabel: 'Close session panel',
  collapseSection: 'Collapse section',
  context: {
    empty: 'No usage reported yet.',
    lastTurn: 'Last turn',
    rows: {
      cacheRead: 'Cache read',
      cacheWrite: 'Cache write',
      cost: 'Cost',
      input: 'Input',
      output: 'Output',
      reasoning: 'Reasoning',
      total: 'Total',
    },
    window: '{used} / {window} · {percent}%',
  },
  environment: {
    agent: 'Agent',
    branch: 'Branch',
    branchDefault: BRANCH_DEFAULT_TEMPLATE,
    checkout: 'Checkout',
    empty: 'Pick a checkout and model to start.',
    mcp: {
      heading: 'MCP servers',
      statuses: {
        connected: 'Connected',
        disabled: 'Disabled',
        failed: 'Failed',
        'needs-auth': 'Needs auth',
        pending: 'Connecting',
      },
    },
    model: 'Model',
    permissions: 'Permissions',
  },
  expandSection: 'Expand section',
  files: {
    count: { many: '{count} files', one: '1 file' },
  },
  pullRequest: {
    chip: '#{number} {state}',
    states: { closed: 'closed', merged: 'merged', open: 'open' },
    title: 'Pull request #{number} ({state})',
  },
  region: 'Session',
  running: {
    agents: 'Agents',
    elapsed: 'Elapsed',
    idle: 'Nothing is running.',
    queued: 'Queued',
    tools: 'Tools',
  },
  sectionTitles: {
    changes: 'Changes',
    context: 'Context',
    environment: 'Environment',
    running: 'Running',
  },
  title: 'Session',
} as const;

/** Copy for {@link ChatLoadEarlier}. */
export const CHAT_LOAD_EARLIER_COPY = {
  label: 'Load earlier messages',
  loading: 'Loading earlier messages…',
} as const;

/** Copy for the composer's image attachment picker, chips and drop zone. @public */
export const CHAT_COMPOSER_ATTACHMENT_COPY = {
  attachImages: 'Attach images',
  dropHint: 'Drop images to attach',
  removePrefix: 'Remove',
  uploading: 'Uploading',
} as const;

/** Copy for the image thumbnails on a sent message. @public */
export const CHAT_MESSAGE_ATTACHMENT_COPY = {
  altFallback: 'Attached image',
  missing: 'Image unavailable',
} as const;

/** Copy for the full-size image preview dialog. @public */
export const CHAT_IMAGE_PREVIEW_COPY = {
  nextImage: 'Next image',
  openOriginal: 'Open original',
  position: '{index} of {total}',
  previousImage: 'Previous image',
} as const;

/**
 * Turn-error copy keyed by the `extensions.reason` the server puts on a
 * rejected attachment turn. @public
 */
export const CHAT_ATTACHMENT_TURN_ERROR_COPY = {
  ATTACHMENTS_UNSUPPORTED: `The selected model does not accept images. Pick an image-capable model or remove the attachments.`,
  ATTACHMENT_NOT_FOUND: `An attached image is no longer available. Remove it and attach it again.`,
  TOO_MANY_ATTACHMENTS: 'Too many images on one message (the limit is 8).',
} as const;
