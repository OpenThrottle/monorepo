import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { CHAT_USAGE_LIMIT_COPY } from '../../data/chat-usage-limit.copy';
import type { ChatUsageLimitNoticeProps } from '../ChatUsageLimitNotice';
import { ChatUsageLimitNotice } from '../ChatUsageLimitNotice';

const renderNotice = (props: ChatUsageLimitNoticeProps): RenderResult => {
  const Comp = (): React.ReactElement => <ChatUsageLimitNotice {...props} />;
  const RoutesStub = createRoutesStub([{ Component: Comp, path: '/' }]);

  return render(<RoutesStub />);
};

describe('ChatUsageLimitNotice Component', () => {
  test('shows the limit line with the reset time when resetsAt is known', () => {
    const component = renderNotice({
      event: {
        kind: 'usageLimit',
        rateLimitType: 'five_hour',
        resetsAt: '2027-01-15T08:00:00.000Z',
        sortOrder: 1,
      },
    });

    const notice = component.getByRole('status');
    expect(notice).toHaveTextContent(CHAT_USAGE_LIMIT_COPY.limitReached);
    expect(notice).toHaveTextContent(CHAT_USAGE_LIMIT_COPY.resetsPrefix);
    expect(notice).toHaveAttribute('data-rate-limit-type', 'five_hour');
  });

  test('omits the reset clause when resetsAt is null', () => {
    const component = renderNotice({
      event: {
        kind: 'usageLimit',
        rateLimitType: null,
        resetsAt: null,
        sortOrder: 1,
      },
    });

    const notice = component.getByTestId('ChatUsageLimitNotice');
    expect(notice).toHaveTextContent(CHAT_USAGE_LIMIT_COPY.limitReached);
    expect(notice).not.toHaveTextContent(CHAT_USAGE_LIMIT_COPY.resetsPrefix);
  });

  test('omits the reset clause when resetsAt is not a date', () => {
    const component = renderNotice({
      event: {
        kind: 'usageLimit',
        rateLimitType: null,
        resetsAt: 'soon',
        sortOrder: 1,
      },
    });

    expect(component.getByRole('status')).not.toHaveTextContent(
      CHAT_USAGE_LIMIT_COPY.resetsPrefix,
    );
  });
});
