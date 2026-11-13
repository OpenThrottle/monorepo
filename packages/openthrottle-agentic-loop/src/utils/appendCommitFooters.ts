import { JOB_FOOTER_KEYS } from '../data/data.git.ts';

const FOOTER_LINE = /^([A-Za-z][A-Za-z-]*: .+|(Closes|Fixes|Resolves) #\d+)$/;

const isJobFooter = (line: string): boolean => {
  return JOB_FOOTER_KEYS.some((key) => line.startsWith(`${key}:`));
};

/**
 * @description Appends the footer lines to a commit message, dropping any `Plan-Id:`/`Task-Id:`
 * the message already carries. Lines join the message's own trailing footer paragraph when it has
 * one, otherwise they start a new paragraph.
 * @public
 */
export const appendCommitFooters = (
  message: string,
  footers: readonly string[],
): string => {
  const kept = message
    .trim()
    .split('\n')
    .filter((line) => !isJobFooter(line.trim()));
  const text = kept.join('\n').trim();
  const paragraphs = text.split(/\n\s*\n/);
  const last = paragraphs.at(-1) ?? '';
  const joinsFooterBlock =
    paragraphs.length > 1 &&
    last.split('\n').every((line) => FOOTER_LINE.test(line.trim()));
  const separator = joinsFooterBlock ? '\n' : '\n\n';

  return `${text}${separator}${footers.join('\n')}\n`;
};
