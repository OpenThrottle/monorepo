/**
 * @description Verification badge styling for {@link LinkedArtifactsPanel}.
 *
 * Verification is state, not the headline. `verified` is the expected outcome,
 * so it reads calm and nearly recedes; `unverified` is a claim still pending.
 * `orphaned` — a claim git could not confirm — is the one row worth acting on,
 * and is the only variant that is allowed to draw the eye.
 * Hoisted out of the component per component-primitive-shape R4.
 */

export const LINKED_ARTIFACT_VERIFICATION_STYLES: Record<string, string> = {
  orphaned:
    'border-amber-500 bg-amber-500/20 text-amber-700 dark:text-amber-300',
  unverified: 'border-transparent bg-transparent text-muted-foreground',
  verified: 'border-transparent bg-transparent text-muted-foreground',
};
