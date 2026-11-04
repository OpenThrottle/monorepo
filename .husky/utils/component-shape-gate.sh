#
# Shared component primitive-shape gate (strict).
#
# Sourced — NOT executed — so its `exit 1` aborts the calling Husky hook. Keep
# the command byte-for-byte identical across all three consumers so the gate a
# commit sees is the same one a push and CI see:
#   - .husky/pre-commit   (commit-time gate)
#   - .husky/pre-push     (push-time gate)
#   - .github/workflows/continuous-integration.yml, step
#     "🧩 Strict audits (audit:strict)", whose `audit:*:strict` glob runs this
#     same script (CI gate)
#
# Mirrors CI so an R4/R5/R6 violation fails at the earliest lifecycle stage
# instead of after the PR is opened. R6 (the 210-line cap) duplicates ESLint
# `max-lines` on purpose: lint-staged runs `eslint --fix` before
# `prettier --write`, and prettier can reflow a file past the cap after lint
# passed. This gate runs on the final content. Do NOT add the `:shadcn:strict`
# variant here — the hooks run this one authored command only.
echo "🧱 Component primitive-shape audit (strict)"
if ! pnpm run audit:component-shape:strict
then
  echo "\n\n 🚫 Component primitive-shape audit failed (R4/R5/R6). Fix the violations listed above before pushing — this is the same gate CI enforces. \n\n"

  # Exit with a non-zero status code to stop the commit/push
  exit 1;
fi
