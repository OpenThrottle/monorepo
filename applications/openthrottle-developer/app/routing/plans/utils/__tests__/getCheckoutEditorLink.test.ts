import { editorHref } from '@openthrottle/react-router-ide';
import { describe, expect, it } from 'vitest';

import { getCheckoutEditorLink } from '~/routing/plans/utils/getCheckoutEditorLink';

describe('getCheckoutEditorLink', () => {
  describe('when there is no checkout', () => {
    it('returns null', () => {
      expect(getCheckoutEditorLink(null)).toBeNull();
      expect(getCheckoutEditorLink(undefined)).toBeNull();
    });
  });

  describe('when there is a checkout', () => {
    it('builds the editor link from its filesystem path', () => {
      const filesystemPath = '/work/repo';

      expect(getCheckoutEditorLink({ filesystemPath })).toBe(
        editorHref({ absolutePath: filesystemPath }),
      );
    });
  });
});
