/**
 * @description Committed constants for the identity scrub. Deliberately free of
 * real identities: emails are rewritten by a deterministic RULE (localpart plus
 * a short hash of the original, on the demo domain), so no personal address
 * ever needs to be committed here and two distinct real addresses can never
 * collide into one demo address (users.email is unique at load).
 *
 * GitHub usernames and repository names are deliberately NOT scrubbed — the
 * repo is public and the workspace is expected to become public.
 */

/** The domain the leak scan allows; every scrubbed email lands on it. */
export const DEMO_EMAIL_DOMAIN = 'atlasworks.example';

/** Home directories collapse to this prefix; the rest of the path is kept. */
export const DEMO_HOME_PREFIX = '/home/demo';

/** Every `*.local` machine hostname collapses to this one. */
export const DEMO_HOSTNAME = 'demo-workstation.local';

/**
 * Third-party organisation names to rewrite inside free text, real → fictional.
 *
 * This is NOT the same call as GitHub usernames and repository names, which are
 * kept: those belong to the public OpenThrottle project, and the workspace is
 * expected to become public. A private employer or client is a different thing
 * — it identifies people and work that never agreed to be on camera.
 *
 * Matched case-insensitively on a word PREFIX, so `Shiftsmart`, `shiftsmart`
 * and the `@shiftsmartinc` npm scope all rewrite consistently; the replacement
 * copies the case of the matched first letter. Add to this whenever a
 * recording, or the leak scan, surfaces a name that should not be there.
 */
export const ORGANISATION_ALIASES: Record<string, string> = {
  shiftsmart: 'atlasworks',
};
