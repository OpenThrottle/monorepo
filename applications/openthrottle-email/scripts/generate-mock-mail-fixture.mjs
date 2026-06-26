/**
 * @description Dev-only generator for the committed mock-mail fixture
 *   (`app/global/data/mock.mail.fixture.json`). Reproduces the seeded faker
 *   data so production code can read a static JSON instead of bundling faker.
 *
 * Run from the app root: `node scripts/generate-mock-mail-fixture.mjs`
 * Faker lives in devDependencies for exactly this regeneration step.
 */

import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fakerEN as faker } from '@faker-js/faker';

const MAIL_FOLDER_IDS = {
  drafts: 'drafts',
  inbox: 'inbox',
  sent: 'sent',
  trash: 'trash',
};

faker.seed(42);

function createMockMessageRecord(folderId) {
  const sentAt = faker.date.recent({ days: 30 });
  const dateStr = sentAt.toISOString().slice(0, 16).replace('T', ' ');
  return {
    body: faker.lorem.paragraphs({ max: 4, min: 1 }, '\n\n'),
    date: dateStr,
    folderId,
    from: faker.internet.email(),
    id: faker.string.uuid(),
    read: faker.helpers.arrayElement([true, false]),
    subject: faker.helpers.arrayElement([
      faker.lorem.sentence(),
      `Re: ${faker.lorem.sentence()}`,
      `Fwd: ${faker.lorem.sentence()}`,
    ]),
    to: faker.internet.email(),
  };
}

const COUNTS = {
  [MAIL_FOLDER_IDS.drafts]: 3,
  [MAIL_FOLDER_IDS.inbox]: 15,
  [MAIL_FOLDER_IDS.sent]: 12,
  [MAIL_FOLDER_IDS.trash]: 5,
};

const recordsByFolder = {
  [MAIL_FOLDER_IDS.drafts]: faker.helpers.multiple(
    () => createMockMessageRecord(MAIL_FOLDER_IDS.drafts),
    { count: COUNTS[MAIL_FOLDER_IDS.drafts] },
  ),
  [MAIL_FOLDER_IDS.inbox]: faker.helpers.multiple(
    () => createMockMessageRecord(MAIL_FOLDER_IDS.inbox),
    { count: COUNTS[MAIL_FOLDER_IDS.inbox] },
  ),
  [MAIL_FOLDER_IDS.sent]: faker.helpers.multiple(
    () => createMockMessageRecord(MAIL_FOLDER_IDS.sent),
    { count: COUNTS[MAIL_FOLDER_IDS.sent] },
  ),
  [MAIL_FOLDER_IDS.trash]: faker.helpers.multiple(
    () => createMockMessageRecord(MAIL_FOLDER_IDS.trash),
    { count: COUNTS[MAIL_FOLDER_IDS.trash] },
  ),
};

const outPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../app/global/data/mock.mail.fixture.json',
);
writeFileSync(outPath, `${JSON.stringify(recordsByFolder, null, 2)}\n`);
console.log(`Wrote ${outPath}`);
