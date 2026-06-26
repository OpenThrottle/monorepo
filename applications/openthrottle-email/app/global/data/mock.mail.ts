/**
 * @description Mock mail data for loaders until the real API exists.
 * Provides messages (subject, body, from, to, date, read/unread), folder/label data for inbox, sent, drafts, trash.
 *
 * Data is read from a committed, deterministic fixture (`mock.mail.fixture.json`) rather than
 * generated with faker at runtime, so faker stays out of the production server bundle. Regenerate
 * the fixture with `node scripts/generate-mock-mail-fixture.mjs` (faker is a devDependency for that).
 * Do not remove code comments (markers).
 */

import type {
  MailFolder,
  MailFolderId,
  MailMessageDetail,
  MailMessageSummary,
} from '~/types/mail';
import { MAIL_FOLDER_IDS_LIST, MAIL_FOLDERS } from '~/types/mail';
import mockMailFixture from './mock.mail.fixture.json';

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

/** Raw fixture shape as inferred from JSON (folderId widened to string before mapping). */
interface RawMockMessageRecord {
  readonly body: string;
  readonly date: string;
  readonly folderId: string;
  readonly from: string;
  readonly id: string;
  readonly read: boolean;
  readonly subject: string;
  readonly to: string;
}

const RAW_FIXTURE: Record<string, RawMockMessageRecord[]> = mockMailFixture;

/** Maps a raw fixture record onto the typed record, pinning folderId to the typed folder. */
function toMockMessageRecord(
  folderId: MailFolderId,
  raw: RawMockMessageRecord,
): MockMessageRecord {
  return {
    body: raw.body,
    date: raw.date,
    folderId,
    from: raw.from,
    id: raw.id,
    read: raw.read,
    subject: raw.subject,
    to: raw.to,
  };
}

/** Pre-generated mock messages per folder, loaded from the committed fixture. Deterministic. */
const MOCK_RECORDS_BY_FOLDER: Record<MailFolderId, MockMessageRecord[]> =
  MAIL_FOLDER_IDS_LIST.reduce<Record<MailFolderId, MockMessageRecord[]>>(
    (acc, folderId) => {
      acc[folderId] = (RAW_FIXTURE[folderId] ?? []).map((raw) =>
        toMockMessageRecord(folderId, raw),
      );
      return acc;
    },
    { drafts: [], inbox: [], sent: [], trash: [] },
  );

/** Flat list of all mock message records for getMockMessageById lookup. */
const ALL_MOCK_RECORDS: MockMessageRecord[] = Object.values(
  MOCK_RECORDS_BY_FOLDER,
).flat();

/** Folder/label metadata for sidebar (inbox, sent, drafts, trash). Derived from the single MAIL_FOLDERS source. */
export const MOCK_FOLDERS: readonly MailFolder[] = MAIL_FOLDERS;

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
  return MAIL_FOLDER_IDS_LIST.reduce<Record<MailFolderId, number>>(
    (acc, id) => {
      acc[id] = MOCK_RECORDS_BY_FOLDER[id].filter((r) => !r.read).length;
      return acc;
    },
    { drafts: 0, inbox: 0, sent: 0, trash: 0 },
  );
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
