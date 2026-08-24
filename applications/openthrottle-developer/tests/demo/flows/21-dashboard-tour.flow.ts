/**
 * @description Flow for `docs/marketing/scripts/21-dashboard-tour.md`.
 *
 * Six stops, no more — the script's own rule, because a tour video's failure mode
 * is a list read aloud. Each stop dwells long enough to actually read the page.
 *
 * The search stop uses the header search, which opens the commander, rather than
 * the `/search` route: that route currently redirects to `/dashboard` in a
 * production build (see the script's note), and the commander is the app's real
 * search entry point anyway.
 */

import { click, dwell, navigate, press, type_, waitFor } from '../runner/types';
import type { DemoFlow } from '../runner/types';

export const flow: DemoFlow = {
  id: '21-dashboard-tour',
  // Tables and full-page forms are wider than the portrait crop window; cropping
  // them clips text at both edges. Fit and letterbox instead.
  portraitStrategy: 'fit',
  regionOfInterest: {
    home: '[data-testid="dashboard-content-grid"]',
    plans: '[data-testid="PlansTable"]',
    schedule: '[data-testid="ScheduleToolbar"]',
    search: '[data-testid="OpenThrottleCommander"]',
    settings: '[data-testid="SettingsAgentsTable"]',
    skills: '[data-testid="SkillsTable"]',
  },
  steps: [
    // 0:00 — home, with seeded activity already on screen.
    navigate('/dashboard', 'home'),
    waitFor('[data-testid="dashboard-content-grid"]'),
    dwell(1_800),

    // 0:14 — plans.
    click('a[href="/plans"]', 'plans'),
    waitFor('[data-testid="PlansTable"]'),
    dwell(1_600),

    // 0:22 — schedule.
    click('a[href="/schedule"]', 'schedule'),
    waitFor('[data-testid="ScheduleToolbar"]'),
    dwell(1_600),

    // 0:30 — search, typing half a thought into the commander.
    click('[data-testid="GlobalLayoutHeaderSearch"] input', 'search'),
    waitFor('[data-testid="OpenThrottleCommander"]'),
    type_(
      '[data-testid="OpenThrottleCommander"] input',
      'how did we handle retries',
    ),
    dwell(1_800),
    press('Escape'),

    // 0:39 — skills.
    click('a[href="/skills"]', 'skills'),
    waitFor('[data-testid="SkillsTable"]'),
    dwell(1_600),

    // 0:47 — settings, on the models section.
    click('a[href="/settings/agents"]', 'settings'),
    waitFor('[data-testid="SettingsAgentsTable"]'),
    dwell(2_000),
  ],
  title: 'The dashboard tour in 60 seconds',
};
