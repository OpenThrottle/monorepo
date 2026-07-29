import * as React from 'react';
import { DocHeadingAnchor } from '../components/DocHeadingAnchor';
import { slugify } from './slugify';

/** Flatten React children to their concatenated text (for slug derivation). */
const childrenToText = (node: unknown): string => {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(childrenToText).join('');
  }
  if (React.isValidElement(node)) {
    const props: unknown = node.props;
    if (typeof props === 'object' && props !== null && 'children' in props) {
      return childrenToText(props.children);
    }
  }
  return '';
};

type HeadingProps = React.ComponentPropsWithoutRef<'h2'>;

const createHeading = (depth: 2 | 3): React.FC<HeadingProps> => {
  const Tag = depth === 2 ? 'h2' : 'h3';

  const Heading = ({ children, ...rest }: HeadingProps): React.ReactElement => {
    const id = slugify(childrenToText(children));

    return (
      <Tag {...rest} className="group scroll-mt-24" id={id}>
        {children}
        {id.length > 0 ? <DocHeadingAnchor slug={id} /> : null}
      </Tag>
    );
  };

  Heading.displayName = `DocHeading${depth}`;
  return Heading;
};

/**
 * MDX component overrides that give doc-page h2/h3 headings a stable `id` (via
 * the shared {@link slugify}) and a hover copy-anchor. Passed to
 * `MarkdownRenderer`'s `components` prop only when the on-page TOC is enabled,
 * so headings render plain when the `toc` feature is off.
 *
 * @public
 */
export const DOC_HEADING_COMPONENTS = {
  h2: createHeading(2),
  h3: createHeading(3),
} as const;
