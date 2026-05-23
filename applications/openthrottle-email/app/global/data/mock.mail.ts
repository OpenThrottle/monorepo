/**
 * @description Faker-based mock mail data for loaders until real API exists.
 * Provides messages (subject, body, from, to, date, read/unread), folder/label data for inbox, sent, drafts, trash.
 * Do not remove code comments (markers).
 */

import { fakerEN as faker } from '@faker-js/faker';
import type {
  MailFolder,
  MailFolderId,
  MailMessageDetail,
  MailMessageSummary,
} from '~/types/mail';
import { MAIL_FOLDER_IDS } from '~/types/mail';

faker.seed(42);

/** Internal message record with folder; mapped to MailMessageSummary / MailMessageDetail for UI. */
interface MockMessageRecord {
  readonly body: string;
  readonly date: string;
  readonly folderId: MailFolderId;
  readonly from: string;
  readonly id: string;
  readonly read: boolean;
  readonly subject: string;
  readonly to: string;
}

function createMockMessageRecord(
  folderId: MailFolderId,
  overrides?: Partial<MockMessageRecord>,
): MockMessageRecord {
  const sentAt = faker.date.recent({ days: 30 });
  const dateStr = sentAt.toISOString().slice(0, 16).replace('T', ' ');
  return {
    body: overrides?.body ?? faker.lorem.paragraphs({ max: 4, min: 1 }, '\n\n'),
    date: overrides?.date ?? dateStr,
    folderId: overrides?.folderId ?? folderId,
    from: overrides?.from ?? faker.internet.email(),
    id: overrides?.id ?? faker.string.uuid(),
    read: overrides?.read ?? faker.helpers.arrayElement([true, false]),
    subject:
      overrides?.subject ??
      faker.helpers.arrayElement([
        faker.lorem.sentence(),
        `Re: ${faker.lorem.sentence()}`,
        `Fwd: ${faker.lorem.sentence()}`,
      ]),
    to: overrides?.to ?? faker.internet.email(),
  };
}

/** Pre-generated mock messages per folder. Seeded for reproducible data. */
const MOCK_RECORDS_BY_FOLDER: Record<MailFolderId, MockMessageRecord[]> = {
  [MAIL_FOLDER_IDS.drafts]: faker.helpers.multiple(
    () => createMockMessageRecord(MAIL_FOLDER_IDS.drafts),
    { count: 3 },
  ),
  [MAIL_FOLDER_IDS.inbox]: faker.helpers.multiple(
    () => createMockMessageRecord(MAIL_FOLDER_IDS.inbox),
    { count: 15 },
  ),
  [MAIL_FOLDER_IDS.sent]: faker.helpers.multiple(
    () => createMockMessageRecord(MAIL_FOLDER_IDS.sent),
    { count: 12 },
  ),
  [MAIL_FOLDER_IDS.trash]: faker.helpers.multiple(
    () => createMockMessageRecord(MAIL_FOLDER_IDS.trash),
    { count: 5 },
  ),
};

/** Flat list of all mock message records for getMockMessageById lookup. */
const ALL_MOCK_RECORDS: MockMessageRecord[] = Object.values(
  MOCK_RECORDS_BY_FOLDER,
).flat();

/** Folder/label metadata for sidebar (inbox, sent, drafts, trash). */
export const MOCK_FOLDERS: MailFolder[] = [
  { id: MAIL_FOLDER_IDS.inbox, label: 'Inbox' },
  { id: MAIL_FOLDER_IDS.sent, label: 'Sent' },
  { id: MAIL_FOLDER_IDS.drafts, label: 'Drafts' },
  { id: MAIL_FOLDER_IDS.trash, label: 'Trash' },
];

function recordToSummary(r: MockMessageRecord): MailMessageSummary {
  return {
    date: r.date,
    from: r.from,
    id: r.id,
    read: r.read,
    subject: r.subject,
  };
}

function recordToDetail(r: MockMessageRecord): MailMessageDetail {
  return {
    body: r.body,
    date: r.date,
    from: r.from,
    id: r.id,
    subject: r.subject,
    to: r.to,
  };
}

/**
 * @description Unread counts per folder for sidebar badges (mock until API is wired).
 */
export function getMockUnreadCountByFolder(): Record<MailFolderId, number> {
  const entries = (Object.keys(MOCK_RECORDS_BY_FOLDER) as MailFolderId[]).map(
    (id) => [id, MOCK_RECORDS_BY_FOLDER[id].filter((r) => !r.read).length],
  );

  return Object.fromEntries(entries) as Record<MailFolderId, number>;
}

/**
 * @description Returns mock message list for a folder (inbox, sent, drafts, trash). Omit folderId for all messages (legacy); prefer passing folderId.
 */
export function getMockMessages(folderId?: MailFolderId): MailMessageSummary[] {
  if (folderId != null) {
    const records = MOCK_RECORDS_BY_FOLDER[folderId] ?? [];
    return records.map(recordToSummary);
  }
  return ALL_MOCK_RECORDS.map(recordToSummary);
}

/**
 * @description Returns a single message by id or undefined. Works across all folders.
 */
export function getMockMessageById(id: string): MailMessageDetail | undefined {
  const record = ALL_MOCK_RECORDS.find((m) => m.id === id);
  return record ? recordToDetail(record) : undefined;
}

/**
 * @description Returns mock messages matching query (subject, from, to, body). Case-insensitive. Replace with API call when backend search is available.
 */
export function getMockSearchResults(query: string): MailMessageSummary[] {
  if (!query.trim()) return [];
  const lower = query.trim().toLowerCase();
  const matching = ALL_MOCK_RECORDS.filter(
    (r) =>
      r.subject.toLowerCase().includes(lower) ||
      r.from.toLowerCase().includes(lower) ||
      r.to.toLowerCase().includes(lower) ||
      r.body.toLowerCase().includes(lower),
  );
  return matching.map(recordToSummary);
}
