import { fillTemplate } from '@openthrottle/nodejs-utils';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import { CHAT_SESSION_DRAWER_COPY } from '../../data/copy';
import { ChatSessionDrawerOpenFile } from '../ChatSessionDrawerOpenFile';

const PATH = 'src/index.ts';

describe('ChatSessionDrawerOpenFile', () => {
  describe('when the host gives no link builder', () => {
    test('renders nothing', () => {
      const component = render(
        <ChatSessionDrawerOpenFile buildFileHref={undefined} path={PATH} />,
      );

      expect(
        component.queryByTestId('ChatSessionDrawerOpenFile'),
      ).not.toBeInTheDocument();
    });
  });

  describe('when the builder returns null for the path', () => {
    test('renders nothing', () => {
      const component = render(
        <ChatSessionDrawerOpenFile buildFileHref={() => null} path={PATH} />,
      );

      expect(component.queryByRole('link')).not.toBeInTheDocument();
    });
  });

  describe('when the builder returns a link', () => {
    test('renders a labelled link to it', () => {
      const component = render(
        <ChatSessionDrawerOpenFile
          buildFileHref={(path) => `vscode://file/work/repo/${path}`}
          path={PATH}
        />,
      );
      const label = fillTemplate(
        CHAT_SESSION_DRAWER_COPY.changes.openInEditor,
        { path: PATH },
      );
      const link = component.getByRole('link', { name: label });

      expect(link).toHaveAttribute(
        'href',
        'vscode://file/work/repo/src/index.ts',
      );
    });
  });
});
