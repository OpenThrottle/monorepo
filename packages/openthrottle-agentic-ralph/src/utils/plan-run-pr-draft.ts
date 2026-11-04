/**
 * Pure validation for the agent-written PR draft (`title.txt` + `body.md`, written by the
 * github-pull-request skill in draft-only mode). The draft is untrusted input: finalize only
 * publishes it after these checks pass, and always with the host's own OT trailer block.
 */

import {
  PLAN_RUN_BODY_CLOSE_MARKER,
  PLAN_RUN_BODY_OPEN_MARKER,
  wrapPlanRunBody,
} from './plan-run-pr-body.ts';

/**
 * @description File names inside the draft directory — the contract in
 * `skills/github-pull-request/SKILL.md` § Draft-only (orchestrator) mode.
 * @public
 */
export const PLAN_RUN_PR_DRAFT_FILES = {
  body: 'body.md',
  title: 'title.txt',
} as const;

/**
 * @description Directory name the skill defaults to inside `git rev-parse --absolute-git-dir`.
 * @public
 */
export const PLAN_RUN_PR_DRAFT_DIR_NAME = 'ot-pr-draft';

/**
 * @description Env var the orchestrator sets on the agent so it writes the draft where finalize reads it.
 * @public
 */
export const PLAN_RUN_PR_DRAFT_DIR_ENV = 'OT_PR_DRAFT_DIR';

const CONVENTIONAL_TITLE = /^[a-z]+(?:\([^)\s][^)]*\))?!?: \S.*$/;
const TODO_MARKER = '**TODO:**';
const TRAILER_LINE = /^\s*(?:Plan-Id|Task-Id):/;
const TITLE_MAX = 256;

export interface ValidatePlanRunPrDraftParams {
  readonly body: string;
  /** @description The host's authoritative `Plan-Id:` / `Task-Id:` block. */
  readonly footer: string;
  readonly title: string;
}

export type PlanRunPrDraftValidation =
  | { readonly body: string; readonly ok: true; readonly title: string }
  | { readonly ok: false; readonly reason: string };

/**
 * @description Validates an agent draft and, when it passes, returns the publishable title and a
 * body whose `Plan-Id:` / `Task-Id:` lines are replaced by `footer` and wrapped in host markers.
 * Rejects a non-conventional or multi-line title, an empty body, and any leftover template TODO.
 * @public
 */
export const validatePlanRunPrDraft = (
  params: ValidatePlanRunPrDraftParams,
): PlanRunPrDraftValidation => {
  const { footer } = params;
  const titleLines = params.title
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');
  const title = titleLines[0] ?? '';

  if (titleLines.length !== 1) {
    return {
      ok: false,
      reason:
        titleLines.length === 0
          ? 'title.txt is empty'
          : 'title.txt is not one line',
    };
  }
  if (title.length > TITLE_MAX || !CONVENTIONAL_TITLE.test(title)) {
    return { ok: false, reason: 'title is not a conventional-commit title' };
  }

  const prose = params.body
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter(
      (line) =>
        !TRAILER_LINE.test(line) &&
        !line.includes(PLAN_RUN_BODY_OPEN_MARKER) &&
        !line.includes(PLAN_RUN_BODY_CLOSE_MARKER) &&
        !line.startsWith('<!-- ot:plan-run-digest'),
    )
    .join('\n')
    .trim();

  if (prose === '') {
    return { ok: false, reason: 'body.md is empty' };
  }
  if (prose.includes(TODO_MARKER)) {
    return { ok: false, reason: 'body.md still contains template TODO text' };
  }

  return { body: wrapPlanRunBody(`${prose}\n\n${footer}`), ok: true, title };
};
