import { createAgentSafetyRule } from './agent-safety-shared.ts';

/**
 * The disable-requires-reason rule: every `eslint-disable`,
 * `eslint-disable-line` and `eslint-disable-next-line` directive states why,
 * using ESLint's own description syntax — `// eslint-disable-next-line
 * no-await-in-loop -- each step reads the previous step's output`.
 *
 * A bare suppression is invisible at review time: it reads as "the linter was
 * wrong here" with nothing to check that claim against, and an agent reaches
 * for one as the cheapest way to turn a red lint green. `eslint-enable` is
 * not a suppression and is never flagged.
 *
 * Blind spot: a blanket `/* eslint-disable *\/` with no rule list suppresses
 * every report after it, this rule's own included, and ESLint gives a rule no
 * way past that. Only generated files use one today, and those are ignored.
 */

type MessageIds = 'missingReason';

const DIRECTIVE_PATTERN =
  /^\s*(eslint-disable(?:-next-line|-line)?)(?=\s|$)([\s\S]*)$/;

/** ESLint's own separator between a directive and its description. */
const DESCRIPTION_SEPARATOR = /\s-{2,}\s/;

/**
 * @description The reason text of a directive comment, or `null` when the
 * comment is not a disable directive at all.
 */
const directiveReason = (
  commentValue: string,
): { readonly directive: string; readonly reason: string } | null => {
  const match = DIRECTIVE_PATTERN.exec(commentValue);
  if (match === null) return null;
  const directive = match[1] ?? 'eslint-disable';
  const rest = ` ${match[2] ?? ''}`;
  const separator = DESCRIPTION_SEPARATOR.exec(rest);
  if (separator === null) return { directive, reason: '' };
  const reason = rest
    .slice(separator.index + separator[0].length)
    .replace(/\*+$/, '')
    .trim();
  return { directive, reason };
};

export const disableRequiresReason = createAgentSafetyRule<[], MessageIds>({
  create(context) {
    return {
      Program(): void {
        for (const comment of context.sourceCode.getAllComments()) {
          const parsed = directiveReason(comment.value);
          if (parsed === null || parsed.reason !== '') continue;
          context.report({
            data: { directive: parsed.directive },
            loc: comment.loc,
            messageId: 'missingReason',
          });
        }
      },
    };
  },
  defaultOptions: [],
  meta: {
    docs: {
      description:
        'Require a `-- reason` on every eslint-disable directive comment.',
    },
    messages: {
      missingReason:
        'State why on this `{{directive}}`: append ` -- <reason>` (ESLint description syntax). A suppression without a reason cannot be reviewed.',
    },
    schema: [],
    type: 'suggestion',
  },
  name: 'disable-requires-reason',
});
