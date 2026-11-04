import type { HarnessTool } from '../anthropic-tool-selector.ts';

/**
 * @description Generic coding-agent tools offered next to the OT surface. Without them a control prompt
 * ("rename this variable") has nowhere to go but OT or plain text, which is not the situation a real agent is
 * in. `write_file` doubles as the trap for "write the plan as a Markdown file" — cases forbid it.
 */
export const HARNESS_TOOLS: readonly HarnessTool[] = [
  {
    description: 'Run a shell command in the repository and return its output.',
    input_schema: {
      properties: { command: { type: 'string' } },
      required: ['command'],
      type: 'object',
    },
    name: 'bash',
  },
  {
    description: 'Replace one exact string in a file.',
    input_schema: {
      properties: {
        new_string: { type: 'string' },
        old_string: { type: 'string' },
        path: { type: 'string' },
      },
      required: ['path', 'old_string', 'new_string'],
      type: 'object',
    },
    name: 'edit_file',
  },
  {
    description: 'Read a file from the repository.',
    input_schema: {
      properties: { path: { type: 'string' } },
      required: ['path'],
      type: 'object',
    },
    name: 'read_file',
  },
  {
    description: 'Create or overwrite a file in the repository.',
    input_schema: {
      properties: { content: { type: 'string' }, path: { type: 'string' } },
      required: ['path', 'content'],
      type: 'object',
    },
    name: 'write_file',
  },
];
