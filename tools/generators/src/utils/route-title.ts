import pluralize from 'pluralize';
import { startCase } from 'lodash';

/**
 * Product capitalization that survives sentence-casing verbatim.
 * @see applications/openthrottle-developer/AGENTS.md (## Page titles)
 */
const RESERVED_WORDS: readonly string[] = ['api', 'faq', 'ide', 'mcp', 'pr'];

/** Flat-route segments that carry no meaning in a page title. */
const IGNORED_SEGMENTS: readonly string[] = ['_index', '_layout'];

/** Leaf segments that read as an action against their parent section. */
const ACTION_SEGMENTS: readonly string[] = ['create', 'edit', 'new'];

/**
 * Sentence-cases a flat-route segment: `pull-requests` -> `Pull requests`,
 * `mcp` -> `MCP`.
 */
const humanizeSegment = (segment: string): string => {
  const words = startCase(segment).split(' ');

  return words
    .map((word, index) => {
      const lower = word.toLowerCase();

      if (RESERVED_WORDS.includes(lower)) return lower.toUpperCase();

      return index === 0 ? word : lower;
    })
    .join(' ');
};

/**
 * Turns a route param segment into the entity it names: `$planId` -> `Plan`,
 * `$repositoryId` -> `Repository`.
 */
const humanizeParamSegment = (segment: string): string => {
  const withoutParam = segment.replace(/^\$/, '');
  const withoutId = withoutParam.replace(/Id$/, '');

  return humanizeSegment(withoutId === '' ? withoutParam : withoutId);
};

const isParamSegment = (segment: string) => segment.startsWith('$');

/**
 * Derives human-facing title parts from a flat-route filename, so a generated
 * route is born with a readable browser-tab title instead of the PascalCase
 * scaffold identifier.
 *
 * `settings.appearance`      -> `Appearance | Settings`
 * `notifications._index`     -> `Notifications`
 * `personas.create`          -> `Create persona | Personas`
 * `plans.$planId._index`     -> `Plan | Plans`
 *
 * @public
 */
export const getRouteTitleVariables = (name: string) => {
  const segments = name
    .split('.')
    .filter(Boolean)
    .filter((segment) => !IGNORED_SEGMENTS.includes(segment));

  if (segments.length === 0) {
    return { nameTitle: 'Untitled', nameTitleLeaf: 'Untitled' } as const;
  }

  const [leafSegment] = segments.slice(-1);
  const ancestors = segments.slice(0, -1);
  // Only a real (non-param) ancestor works as a section label.
  const sectionCandidates = ancestors.filter(
    (segment) => !isParamSegment(segment),
  );
  const sectionSegment = sectionCandidates[sectionCandidates.length - 1];

  const section =
    sectionSegment === undefined ? undefined : humanizeSegment(sectionSegment);

  const isAction = ACTION_SEGMENTS.includes(leafSegment.toLowerCase());

  const leaf = (() => {
    if (isAction && section !== undefined) {
      const entity = pluralize.singular(section).toLowerCase();

      return `${humanizeSegment(leafSegment)} ${entity}`;
    }

    if (isParamSegment(leafSegment)) return humanizeParamSegment(leafSegment);

    return humanizeSegment(leafSegment);
  })();

  const nameTitle =
    section === undefined || section === leaf ? leaf : `${leaf} | ${section}`;

  return { nameTitle, nameTitleLeaf: leaf } as const;
};
