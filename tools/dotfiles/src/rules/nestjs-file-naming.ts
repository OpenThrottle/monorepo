import type { TSESTree } from '@typescript-eslint/utils';
import { ESLintUtils } from '@typescript-eslint/utils';

import {
  FOLDER_KINDS,
  parseNestFile,
  SUBJECT_KINDS,
} from './nestjs-file-shared.ts';

/**
 * The nestjs-file-naming rule: a NestJS file is named `<folder>.<kind>.ts`
 * (docs/monorepo/code-style.md, "NestJS file names").
 *
 *   - Every file states its kind — a kindless `reading-time-minutes.ts` is
 *     reported (`missingKind`).
 *   - The kind is one of the fixed set in `nestjs-file-shared.ts`
 *     (`unknownKind`).
 *   - A module-scoped kind (module, service, processor, resolver, controller,
 *     types, constants, utils) is named for its folder: in `queues/plans/`
 *     only `plans.service.ts` is a service name. A second service there is a
 *     second unit and moves to `queues/plans/<name>/<name>.service.ts`
 *     (`folderMismatch`).
 *   - A test is checked as its source name; a folder-level test with no single
 *     source is `<folder>.test.ts`.
 *
 * `index.ts`, `main.ts`, declaration files and an application's root
 * `src/app.module.ts` are exempt. Anything else that must keep its name (boot
 * side-effect files whose import order matters) is excluded by the consuming
 * config's `ignores`, where the exception is visible at review time.
 */

type MessageIds = 'folderMismatch' | 'missingKind' | 'unknownKind';

const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/OpenThrottle/monorepo/blob/main/docs/monorepo/code-style.md#${name}`,
);

const KIND_LIST = [...FOLDER_KINDS, ...SUBJECT_KINDS]
  .map((kind) => `.${kind}.ts`)
  .join(', ');

export const nestjsFileNaming = createRule<[], MessageIds>({
  create(context) {
    const parsed = parseNestFile(context.filename);
    if (parsed === null) return {};

    const { basename, extension, folder, isSourceRoot, isTest, kind, stem } =
      parsed;
    const report = (
      node: TSESTree.Program,
      messageId: MessageIds,
      data: Record<string, string>,
    ): void => {
      context.report({ data, loc: { column: 0, line: 1 }, messageId, node });
    };

    return {
      Program(program): void {
        if (kind === null) {
          // `<folder>.test.ts` is the one kindless name: a test of the folder
          // as a whole rather than of a single source file.
          if (isTest && stem === folder) return;
          report(program, 'missingKind', {
            basename,
            folder,
            kinds: KIND_LIST,
          });
          return;
        }

        if (FOLDER_KINDS.includes(kind)) {
          if (stem === folder) return;
          if (isSourceRoot && kind === 'module' && stem === 'app') return;
          report(program, 'folderMismatch', {
            basename,
            expected: `${folder}.${kind}${extension}`,
            kind,
            subfolder: `${stem}/${stem}.${kind}${extension}`,
          });
          return;
        }

        if (!SUBJECT_KINDS.includes(kind)) {
          report(program, 'unknownKind', { basename, kind, kinds: KIND_LIST });
        }
      },
    };
  },
  defaultOptions: [],
  meta: {
    docs: {
      description:
        'Name NestJS files `<folder>.<kind>.ts`, with the kind drawn from a fixed set.',
    },
    messages: {
      folderMismatch:
        '`{{basename}}`: a `.{{kind}}.ts` file is named for its folder — expected `{{expected}}`. If this folder already has one, this {{kind}} is a separate unit: move it to `{{subfolder}}`.',
      missingKind:
        '`{{basename}}` has no kind suffix. Name it `{{folder}}.<kind>.ts` (or `<subject>.<kind>.ts` for a subject kind), with a kind from: {{kinds}}.',
      unknownKind:
        '`{{basename}}`: `.{{kind}}.ts` is not a NestJS file kind. Use one of: {{kinds}}.',
    },
    schema: [],
    type: 'suggestion',
  },
  name: 'nestjs-file-naming',
});
