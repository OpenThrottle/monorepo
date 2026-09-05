import type { LinkProps } from 'react-router';
import {
  GENERATOR_DOCS_AGENT_USAGE,
  GENERATOR_DOCS_AGENTS,
  GENERATOR_DOCS_NX_LOCAL_GENERATORS,
  GENERATOR_DOCS_PERSONAL_GENERATORS,
  GENERATOR_DOCS_TOOLS_PACKAGE_README,
} from '~/routing/generators/constants/generator-nx-docs';

export const generators: LinkProps[] = [
  {
    children: 'Nx — local generators (nx.dev)',
    to: GENERATOR_DOCS_NX_LOCAL_GENERATORS,
  },
  {
    children: '@tools/generators package (tools/generators/README.md)',
    to: GENERATOR_DOCS_TOOLS_PACKAGE_README,
  },
  {
    children: 'Generator-first rule (.cursor/rules/personal-generators.mdc)',
    to: GENERATOR_DOCS_PERSONAL_GENERATORS,
  },
  {
    children: 'AGENTS.md — Nx and workflow conventions',
    to: GENERATOR_DOCS_AGENTS,
  },
  {
    children: 'Generator usage (docs/tools/templates/AGENT_USAGE.md)',
    to: GENERATOR_DOCS_AGENT_USAGE,
  },
];
