import { describe, expect, test } from 'vitest';

import { acceptsImageInput } from '../acceptsImageInput';
import { decodeChatOption } from '../chat-model-option';

const runtime = (imageInput: boolean) => {
  return {
    approvals: false,
    authStatus: 'authenticated',
    editApprovals: false,
    imageInput,
  };
};

const localId = 'http://localhost:11434/v1::llama3';

describe('acceptsImageInput', () => {
  const decodedOption = decodeChatOption(localId);

  test('is false with no decoded option', () => {
    expect(
      acceptsImageInput({
        agentRuntimes: {},
        decodedOption: null,
        modelId: undefined,
        models: [],
      }),
    ).toBe(false);
  });

  describe('when the backend runtime reports imageInput', () => {
    test('is true', () => {
      const backend = decodedOption?.backend ?? '';

      expect(
        acceptsImageInput({
          agentRuntimes: { [backend]: runtime(true) },
          decodedOption,
          modelId: localId,
          models: [{ id: localId, label: 'llama3' }],
        }),
      ).toBe(true);
    });
  });

  describe('when only the selected model is vision-capable', () => {
    test('is true', () => {
      expect(
        acceptsImageInput({
          agentRuntimes: {},
          decodedOption,
          modelId: localId,
          models: [{ id: localId, imageInput: true, label: 'llava' }],
        }),
      ).toBe(true);
    });
  });

  describe('when neither the runtime nor the model accepts images', () => {
    test('is false', () => {
      expect(
        acceptsImageInput({
          agentRuntimes: {},
          decodedOption,
          modelId: localId,
          models: [{ id: localId, label: 'llama3' }],
        }),
      ).toBe(false);
    });
  });
});
