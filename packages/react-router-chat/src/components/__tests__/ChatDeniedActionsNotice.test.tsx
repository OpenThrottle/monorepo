import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { CHAT_DENIED_ACTIONS_COPY } from '../../data/data.copy';
import type { ChatDeniedActionsNoticeProps } from '../ChatDeniedActionsNotice';
import { ChatDeniedActionsNotice } from '../ChatDeniedActionsNotice';

const renderNotice = (props: ChatDeniedActionsNoticeProps): RenderResult => {
  const Comp = (): React.ReactElement => {
    return <ChatDeniedActionsNotice {...props} />;
  };
  const RoutesStub = createRoutesStub([{ Component: Comp, path: '/' }]);

  return render(<RoutesStub />);
};

describe('ChatDeniedActionsNotice Component', () => {
  test('names every denied action in one status line with the hint', () => {
    const component = renderNotice({
      event: {
        actions: ['McpTool', 'pwd'],
        kind: 'deniedActions',
        sortOrder: 3,
      },
    });

    const notice = component.getByRole('status');
    expect(notice).toHaveTextContent(CHAT_DENIED_ACTIONS_COPY.prefix);
    expect(notice).toHaveTextContent(CHAT_DENIED_ACTIONS_COPY.hint);
    expect(
      component.getByTestId('ChatDeniedActionsNotice-actions'),
    ).toHaveTextContent('McpTool, pwd.');
  });
});
