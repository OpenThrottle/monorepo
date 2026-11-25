import type {
  AgentConversationGroup,
  AgentConversationListItem,
} from '../types';

/** The date buckets the sidebar files ungrouped conversations under. */
export type ConversationDateSectionKey =
  'older' | 'pinned' | 'previous-week' | 'today';

/**
 * One sidebar section: a fixed date bucket (or Pinned), or a user-defined
 * group. A group section is listed even when empty, so it can be filled.
 */
export type ConversationSection =
  | {
      readonly conversations: readonly AgentConversationListItem[];
      readonly key: ConversationDateSectionKey;
      readonly kind: 'date';
    }
  | {
      readonly conversations: readonly AgentConversationListItem[];
      readonly group: AgentConversationGroup;
      readonly kind: 'group';
    };

const startOfDay = (date: Date): number => {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
};

/**
 * @description The date bucket for an ungrouped conversation, by its
 * `updatedAt` against `now` in local time: the same day is Today, the six days
 * before it are Previous 7 days, anything earlier (or unparseable) is Older.
 */
export const conversationDateKey = (
  conversation: AgentConversationListItem,
  now: Date,
): ConversationDateSectionKey => {
  const updatedAt = Date.parse(conversation.updatedAt);
  if (Number.isNaN(updatedAt)) {
    return 'older';
  }

  const DAY_MS = 86_400_000;
  const today = startOfDay(now);
  if (updatedAt >= today) {
    return 'today';
  }

  return updatedAt >= today - 6 * DAY_MS ? 'previous-week' : 'older';
};

/**
 * @description Files conversations into sidebar sections, in display order:
 * Pinned, then each group in `sortOrder` (empty ones too), then Today,
 * Previous 7 days and Older. A pinned conversation shows under Pinned only; one
 * whose group is not in `groups` (not loaded, or grouping off) is treated as
 * ungrouped. Empty date sections are dropped. Input order is kept within each
 * section, so the list's newest-first order carries through.
 */
export const buildConversationSections = (
  conversations: readonly AgentConversationListItem[],
  groups: readonly AgentConversationGroup[],
  now: Date,
): readonly ConversationSection[] => {
  const groupIds = new Set(groups.map((group) => group.id));
  const pinned = conversations.filter((conversation) => conversation.pinned);
  const unpinned = conversations.filter((conversation) => !conversation.pinned);
  const isGrouped = (conversation: AgentConversationListItem): boolean => {
    return conversation.groupId != null && groupIds.has(conversation.groupId);
  };
  const loose = unpinned.filter((conversation) => !isGrouped(conversation));

  const groupSections: ConversationSection[] = [...groups]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((group) => ({
      conversations: unpinned.filter(
        (conversation) => conversation.groupId === group.id,
      ),
      group,
      kind: 'group',
    }));

  const dateKeys: readonly ConversationDateSectionKey[] = [
    'today',
    'previous-week',
    'older',
  ];
  const dateSections: ConversationSection[] = dateKeys.map((key) => ({
    conversations: loose.filter(
      (conversation) => conversationDateKey(conversation, now) === key,
    ),
    key,
    kind: 'date',
  }));
  const pinnedSection: ConversationSection = {
    conversations: pinned,
    key: 'pinned',
    kind: 'date',
  };

  return [pinnedSection, ...groupSections, ...dateSections].filter(
    (section) => section.kind === 'group' || section.conversations.length > 0,
  );
};
