#
# Shared component primitive-shape gate (strict).
#
# Sourced — NOT executed — so its `exit 1` aborts the calling Husky hook. Keep
# the command byte-for-byte identical across all three consumers so the gate a
# commit sees is the same one a push and CI see:
#   - .husky/pre-commit   (commit-time gate)
#   - .husky/pre-push     (push-time gate)
#   - .github/workflows/continuous-integration.yml, step
#     "🧱 Component primitive-shape audit" (CI gate)
#
# Mirrors the CI step so an R4/R5 violation fails at the earliest lifecycle
# stage instead of after the PR is opened. Do NOT add the `:shadcn:strict`
# variant here — the three surfaces run this one authored command only.
echo "🧱 Component primitive-shape audit (strict)"
if ! pnpm run audit:component-shape:strict
then
  echo "\n\n 🚫 Component primitive-shape audit failed (R4/R5). Fix the violations listed above before pushing — this is the same gate CI enforces. \n\n"

  # Exit with a non-zero status code to stop the commit/push
  exit 1;
fi
