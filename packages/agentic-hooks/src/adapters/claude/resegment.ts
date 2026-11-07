/**
 * One-off, operator-run re-segment of already-uploaded session trajectories.
 * NOT a hook: nothing registers it, and it is not shipped in the plugin
 * payload.
 *
 * Usage: node .claude/hooks/session-trajectory-resegment.cjs --session <id>
 *   [--session <id> ...] [--dry-run] [--projects-dir <path>]
 *   [--repo-root <path>] [--timeout-ms <n>]
 *
 * A segment whose task id matches an existing session_upload row is UPDATEd in
 * place (same id, so eval_human_labels survive). New plan-level segments
 * INSERT. `--dry-run` prints old vs new step counts and writes nothing.
 * Re-running after a successful write is a no-op (byte-identical skips).
 */
import { logHookError } from '../../index.ts';
import { parseResegmentArgs, RESEGMENT_USAGE } from './resegment-args.ts';
import { runResegment } from './resegment-run.ts';

const main = async (): Promise<number> => {
  const parsed = parseResegmentArgs({
    argv: process.argv.slice(2),
    cwd: process.cwd(),
    env: process.env,
  });
  if (parsed.kind === 'help') {
    process.stdout.write(`${RESEGMENT_USAGE}\n`);
    return 0;
  }
  if (parsed.kind === 'error') {
    process.stderr.write(`${parsed.error}\n${RESEGMENT_USAGE}\n`);
    return 1;
  }
  return runResegment({
    options: parsed.options,
    stderr: (text) => {
      process.stderr.write(text);
    },
    stdout: (text) => {
      process.stdout.write(text);
    },
  });
};

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err: unknown) => {
    logHookError('resegment failed', err);
    process.exitCode = 1;
  });
