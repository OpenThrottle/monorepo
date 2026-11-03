import type { ChatModelOption } from '@openthrottle/react-router-chat';

/**
 * @description Discovered agent+model options as the loader's `loadComposerModels`
 * emits them (`backend|model` ids), plus a local OpenAI endpoint a plan run cannot use.
 * Shared by the plan-run model picker and effort control specs.
 */
export const MOCK_PLAN_RUN_MODELS: readonly ChatModelOption[] = [
  {
    groupId: 'cursor',
    id: 'cursor|auto',
    label: 'auto',
    subLabel: 'Cursor',
  },
  {
    groupId: 'cursor',
    id: 'cursor|gpt-5.2',
    label: 'gpt-5.2',
    subLabel: 'Cursor',
  },
  {
    groupId: 'claude',
    id: 'claude|opus',
    label: 'opus',
    subLabel: 'Claude Code',
  },
  {
    groupId: 'openai:lmstudio',
    id: 'http://localhost:1234/v1::llama3',
    label: 'llama3',
  },
];
