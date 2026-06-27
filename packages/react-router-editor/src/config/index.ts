/**
 * @description Configuration constants for the OpenThrottle Editor package.
 * Defines prompt types, validation patterns, and shared constants.
 */

export * from './loader';

/**
 * @description Prompt document types representing different AI workflow document purposes.
 * These match the database schema types for custom prompts.
 */
export const PROMPT_TYPES = {
  AGENTS: 'agents',
  COMMANDS: 'commands',
  PROMPTS: 'prompts',
  SKILLS: 'skills',
} as const;

export type PromptType = (typeof PROMPT_TYPES)[keyof typeof PROMPT_TYPES];

export const PROMPT_TYPE_VALUES = Object.values(PROMPT_TYPES);

/**
 * @description Human-readable labels for prompt types used in UI dropdowns.
 */
export const PROMPT_TYPE_OPTIONS = [
  { name: 'Agents', value: PROMPT_TYPES.AGENTS },
  { name: 'Commands', value: PROMPT_TYPES.COMMANDS },
  { name: 'Prompts', value: PROMPT_TYPES.PROMPTS },
  { name: 'Skills', value: PROMPT_TYPES.SKILLS },
] as const;

/**
 * @description Regex pattern for validating PascalCase naming convention.
 */
export const REGEX_PASCAL_CASE = /^[A-Z][a-zA-Z0-9]*$/;

/**
 * @description Regex pattern for validating kebab-case naming convention.
 */
export const REGEX_KEBAB_CASE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/**
 * @description Supported file extensions and their corresponding Monaco language identifiers.
 */
export const FILE_EXTENSIONS = {
  css: 'css',
  js: 'javascript',
  json: 'json',
  jsx: 'typescript',
  md: 'markdown',
  mdc: 'markdown',
  ts: 'typescript',
  tsx: 'typescript',
  yaml: 'yaml',
  yml: 'yaml',
} as const;

export type FileExtension = keyof typeof FILE_EXTENSIONS;
export type EditorLanguage = (typeof FILE_EXTENSIONS)[FileExtension];

/**
 * @description Default editor theme configuration.
 */
export const EDITOR_DEFAULTS = {
  fontSize: 14,
  language: 'markdown',
  lineNumbers: 'on' as const,
  minimap: { enabled: false },
  tabSize: 2,
  theme: 'vs-dark',
  wordWrap: 'on' as const,
} as const;
