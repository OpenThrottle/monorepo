import { DocCodeBlock } from '../components/DocCodeBlock';

/**
 * MDX component overrides that add a copy button to fenced code blocks. Passed
 * to `MarkdownRenderer`'s `components` prop only when the `codeCopy` feature is
 * enabled, so code blocks render plain when it is off.
 *
 * @public
 */
export const DOC_CODE_COMPONENTS = {
  pre: DocCodeBlock,
} as const;
