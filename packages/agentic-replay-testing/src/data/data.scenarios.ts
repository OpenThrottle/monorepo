import {
  CONVERSATION_PERMISSION_MODES,
  CONVERSATION_REASONING_EFFORTS,
} from '@openthrottle/openthrottle-agentic-utils';

import type { Scenario, ScenarioTurn } from '../types/scenario.ts';

const TURN: ScenarioTurn = {
  abortAfterFirstChunk: false,
  permissionMode: undefined,
  prompt: '',
  reasoning: undefined,
  systemPrompt: undefined,
};

const SCENARIO: Scenario = {
  description: '',
  expectAbsentFiles: [],
  model: undefined,
  seedFiles: {},
  slug: '',
  turns: [],
};

const NOTES = `# Replay fixture notes\n\nThis file exists so a tool-use scenario has something to read.\n`;

/**
 * The shared scenarios every backend records. Prompts are deliberately tiny
 * and deterministic so a re-record diff shows protocol change, not model drift.
 *
 * @public
 */
export const SCENARIOS: readonly Scenario[] = [
  {
    ...SCENARIO,
    description: 'Accept-edits posture: the write tool runs without approval.',
    slug: 'accept-edits',
    turns: [
      {
        ...TURN,
        permissionMode: CONVERSATION_PERMISSION_MODES.autoAcceptEdits,
        prompt: `Use your file-writing tool to create out.txt containing exactly: hello. Then reply with: done.`,
      },
    ],
  },
  {
    ...SCENARIO,
    description: 'The CLI rejects the turn: an unknown model id.',
    model: 'not-a-real-model',
    slug: 'error',
    turns: [{ ...TURN, prompt: 'Reply with exactly: pong' }],
  },
  {
    ...SCENARIO,
    description: 'The user cancels mid-stream; the backend tears the CLI down.',
    slug: 'interrupt',
    turns: [
      {
        ...TURN,
        abortAfterFirstChunk: true,
        prompt: 'Count from 1 to 300, one number per line, with no other text.',
      },
    ],
  },
  {
    ...SCENARIO,
    description: 'Several tool calls in one turn, with full access.',
    seedFiles: { 'notes.md': NOTES },
    slug: 'multi-tool',
    turns: [
      {
        ...TURN,
        permissionMode: CONVERSATION_PERMISSION_MODES.fullAccess,
        prompt: `List the files in the current directory with a shell command, then read notes.md. Reply with only the number of files.`,
      },
    ],
  },
  {
    ...SCENARIO,
    description: `Supervised posture: a write needs approval, so headless it is denied.`,
    expectAbsentFiles: ['out.txt'],
    slug: 'permission-denied',
    turns: [
      {
        ...TURN,
        permissionMode: CONVERSATION_PERMISSION_MODES.supervised,
        prompt: `Use your file-writing tool to create out.txt containing exactly: hello. If you cannot, reply with: denied.`,
      },
    ],
  },
  {
    ...SCENARIO,
    description: 'A second turn resumes the first turn’s session.',
    slug: 'resume',
    turns: [
      { ...TURN, prompt: 'Remember the code word: heron. Reply with: OK.' },
      {
        ...TURN,
        prompt: 'What was the code word? Reply with the word only.',
      },
    ],
  },
  {
    ...SCENARIO,
    description: 'One text-only turn: init, text, usage, result.',
    slug: 'simple-turn',
    turns: [{ ...TURN, prompt: 'Reply with exactly: pong' }],
  },
  {
    ...SCENARIO,
    description: 'A persona system prompt steers the reply.',
    slug: 'system-prompt',
    turns: [
      {
        ...TURN,
        prompt: 'Say hello.',
        systemPrompt: 'You are terse. Always answer in uppercase.',
      },
    ],
  },
  {
    ...SCENARIO,
    description: 'Raised reasoning effort, so the stream carries thinking.',
    slug: 'thinking',
    turns: [
      {
        ...TURN,
        prompt: `Find the smallest prime greater than 1000 whose digits sum to 20. Reason step by step, then reply with the number only.`,
        reasoning: CONVERSATION_REASONING_EFFORTS.max,
      },
    ],
  },
  {
    ...SCENARIO,
    description: 'One read-only tool call and its result.',
    seedFiles: { 'notes.md': NOTES },
    slug: 'tool-use',
    turns: [
      {
        ...TURN,
        prompt: 'Read notes.md and reply with its first heading only.',
      },
    ],
  },
];
