import { describe, expect, it } from 'vitest';

import { CMS_SAFELIST_GROUPS } from '../../data/data.cms-safelist';
import { buildCmsSafelist } from '../buildCmsSafelist';

describe('buildCmsSafelist', () => {
  it('emits one @source inline rule per pattern', () => {
    const css = buildCmsSafelist();
    const patterns = Object.values(CMS_SAFELIST_GROUPS).flat();

    expect(css.match(/@source inline\(/g)).toHaveLength(patterns.length);
  });

  it('labels every group with a comment', () => {
    const css = buildCmsSafelist();

    for (const name of Object.keys(CMS_SAFELIST_GROUPS)) {
      expect(css).toContain(`/* ${name} */`);
    }
  });

  it('matches the committed src/cms-safelist.css', async () => {
    await expect(buildCmsSafelist()).toMatchFileSnapshot(
      '../../cms-safelist.css',
    );
  });
});
