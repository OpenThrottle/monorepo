/**
 * @description Prompt guardrails shared by `workflow-ralph` CLI and in-process Ralph orchestrator.
 * Instructs the agent to keep completion signals as plain text and avoid multiline prose in Shell.
 */
export const RALPH_SHELL_COMMAND_GUARDRAIL = [
  'SHELL SAFETY — Do NOT paste multiline prose into the Shell tool. Each shell command must be a single, valid command line.',
  'Never run summaries, file inventories, task recaps, or the <ralph:task-complete>…</ralph:task-complete> / <promise>…</promise> signals through the Shell tool — emit those only as plain assistant text.',
  'Feeding multiline prose to the shell makes /bin/sh treat each line as a separate command and produces "command not found" / syntax-error spam.',
].join('\n');
