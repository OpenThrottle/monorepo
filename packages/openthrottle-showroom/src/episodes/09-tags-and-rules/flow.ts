/**
 * @description Flow for `docs/marketing/scripts/09-tags-and-rules.md`.
 *
 * Transcribed from that script's on-screen-action column, beat for beat. If the
 * script changes, change this; if this needs a step the script does not describe,
 * the script is wrong.
 *
 * What rules actually do today (audited against the app, 2026-08): adding a tag
 * enqueues a BullMQ evaluation, and a matched `inject-task` rule inserts a task —
 * with NO client-side feedback. There is no toast, the rule-applications ledger
 * component is commented out of the plan page, and the injected task does not
 * live-update into view (the executor emits no notification). So the fired rule
 * is shown the only way it can be: re-open the plan and the injected task is
 * there. The script's "a toast shows" and "hold on the rule-applications list"
 * beats were rewritten around that — see `./episode.ts`.
 *
 * Fixture prerequisites (all in `../../fixtures/demo-content.ts`, seeded by
 * `../../scripts/seed-demo.ts`):
 * - the `needs-review` tag in the demo user's vocabulary,
 * - one enabled seeded rule (`needs-review` → inject `code-review-checklist`),
 * - the dogfood project + `project_skills` rows, without which `/rules/new`'s
 *   skill dropdown is empty.
 *
 * Recording preconditions: the server must run its queue workers, and no other
 * server may share its Redis queues (stop the dev stack or set a distinct
 * `OT_QUEUE_PREFIX`, or a dev worker steals the evaluation job — see 08). The
 * waits on injected-task titles are state waits on an asynchronous job — the
 * dwell before each re-navigate is what gives the worker its head start.
 *
 * Seven flow beats, matching the script's seven narration rows — narration is
 * matched to flow beats POSITIONALLY (assemble/timeline.ts).
 */

import {
  click,
  dwell,
  highlight,
  navigate,
  select,
  type_,
  waitFor,
} from '../../runner/types';
import type { DemoFlow } from '../../runner/types';

/** The rate-limiting plan — the seeded rule fires on it at 0:00. */
const PLAN_A = 'd0d0d0d0-0000-4000-8000-000000000001';

/** The layer-catalogue plan — the on-camera rule fires on it at 0:42. */
const PLAN_B = 'd0d0d0d0-0000-4000-8000-000000000007';

/** The seeded rule's title, as fixed in the fixture. */
const SEEDED_RULE_TITLE = 'Review anything tagged needs-review';

/** What the seeded rule injects: its titleTemplate applied to PLAN_A's title. */
const INJECTED_A = 'Review: Add rate limiting to the public API';

/** The rule created on camera. */
const NEW_RULE_TITLE = 'Add a testing task';

/** InjectTaskExecutor's default title for a rule with no titleTemplate. */
const INJECTED_B = 'Run /write-tests (required by rule)';

export const flow: DemoFlow = {
  id: '09-tags-and-rules',
  // Tables and the full-width rule form are wider than the portrait crop window;
  // cropping them clips text at both edges. Fit and letterbox instead.
  portraitStrategy: 'fit',
  regionOfInterest: {
    fires: '[data-testid="PlanTagChips"]',
    hook: '[data-testid="PlanTagChips"]',
    'new-rule': '[data-testid="RuleForm"]',
    payoff: '[data-testid="GlobalHeading"]',
    'rule-detail': '[data-testid="RuleForm"]',
    rules: '[data-testid="RulesTable"]',
    saved: '[data-testid="RulesTable"]',
  },
  steps: [
    // 0:00 — add one tag; the seeded rule injects a review task. No client
    // feedback exists for the injection, so the re-navigate is the reveal.
    navigate(`/plans/${PLAN_A}?tab=tasks`, 'hook'),
    waitFor('[data-testid="PlanTagChips"]'),
    dwell(700),
    select('[data-testid="PlanTagChips"] select', 'needs-review'),
    click('[data-testid="PlanTagChips"] button:has-text("Add")'),
    waitFor('[data-testid="PlanTagChips"] >> text="needs-review"'),
    dwell(2_200),
    navigate(`/plans/${PLAN_A}?tab=tasks`),
    waitFor(`text="${INJECTED_A}"`),
    highlight(`text="${INJECTED_A}"`, 1_600),
    dwell(1_200),

    // 0:09 — the rules page: labels, watched and acted on.
    navigate('/rules', 'rules'),
    waitFor('[data-testid="RulesTable"]'),
    dwell(2_600),

    // 0:16 — the rule that just fired. Rules have no detail page; the title
    // opens the edit form, which is the whole rule on one screen.
    click(`a[aria-label="Edit: ${SEEDED_RULE_TITLE}"]`, 'rule-detail'),
    waitFor('[data-testid="RuleForm"]'),
    dwell(3_600),

    // 0:25 — make one: a name, the label to watch, and what to do.
    navigate('/rules', 'new-rule'),
    waitFor('[data-testid="RulesToolbar-create-button"]'),
    click('[data-testid="RulesToolbar-create-button"]'),
    waitFor('[data-testid="RuleForm"]'),
    type_('#rule-title', NEW_RULE_TITLE),
    click('[data-testid="RuleForm"] button:has-text("testing")'),
    dwell(500),
    select('#rule-skill-slug', 'write-tests'),
    dwell(900),

    // 0:35 — save; it lands in the list, enabled.
    click('[data-testid="RuleForm"] button:has-text("Save rule")', 'saved'),
    waitFor(`[data-testid="RulesTable"] >> text="${NEW_RULE_TITLE}"`),
    highlight(`[data-testid="RulesTable"] >> text="${NEW_RULE_TITLE}"`, 1_600),
    dwell(1_400),

    // 0:42 — a different plan gets the tag; the new rule handles it the same way.
    navigate(`/plans/${PLAN_B}?tab=tasks`, 'fires'),
    waitFor('[data-testid="PlanTagChips"]'),
    select('[data-testid="PlanTagChips"] select', 'testing'),
    click('[data-testid="PlanTagChips"] button:has-text("Add")'),
    waitFor('[data-testid="PlanTagChips"] >> text="testing"'),
    dwell(2_200),
    navigate(`/plans/${PLAN_B}?tab=tasks`),
    waitFor(`text="${INJECTED_B}"`),
    dwell(1_000),

    // 0:50 — what it did, on the record: the injected task, in the plan.
    highlight(`text="${INJECTED_B}"`, 2_000, 'payoff'),
    dwell(2_400),
  ],
  title: 'Tags and rules — automate what happens when work gets labelled',
};
