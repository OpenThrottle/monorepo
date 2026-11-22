import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';

import { SKILL_RUN_COPY } from '~/routing/skills/data/data.copy';

import { SkillRunConversation } from '../SkillRunConversation';

describe('SkillRunConversation Component', () => {
  test('should render the conversation dialog when open', async () => {
    const Component = () => {
      return (
        <SkillRunConversation
          runSkill={{
            conversationOpen: true,
            isStreaming: false,
            messages: [],
            onConversationOpenChange: vi.fn(),
            onRun: vi.fn(),
            onSendFollowUp: vi.fn(),
            onStop: vi.fn(),
          }}
        />
      );
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(
      await component.findByText(SKILL_RUN_COPY.conversationTitle),
    ).toBeInTheDocument();
  });
});
