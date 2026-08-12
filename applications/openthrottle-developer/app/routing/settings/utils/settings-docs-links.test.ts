import { describe, expect, test } from 'vitest';
import {
  LOCAL_SERVICES_PORTS_DOC_HREF,
  LOCAL_SERVICES_PORTS_SERVICES_TABLE_HREF,
  MCP_DEVELOPER_AUTH_DOC_HREF,
  VITE_DEVTOOLS_DOC_HREF,
  VITE_DEVTOOLS_DOC_PROFILING_HREF,
  VITE_DEVTOOLS_DOC_QUICK_REF_HREF,
} from './settings-docs-links';

describe('settings docs links', () => {
  test('base hrefs point at the monorepo docs on GitHub', () => {
    expect(VITE_DEVTOOLS_DOC_HREF).toBe(
      'https://github.com/OpenThrottle/monorepo/blob/main/docs/monorepo/openthrottle-developer-vite-devtools.md',
    );
    expect(LOCAL_SERVICES_PORTS_DOC_HREF).toBe(
      'https://github.com/OpenThrottle/monorepo/blob/main/docs/monorepo/local-services-and-ports.md',
    );
    expect(MCP_DEVELOPER_AUTH_DOC_HREF).toBe(
      'https://github.com/OpenThrottle/monorepo/blob/main/packages/openthrottle-mcp/docs/AUTH.md',
    );
  });

  test('anchor hrefs are derived from their base href with the expected fragment', () => {
    expect(VITE_DEVTOOLS_DOC_PROFILING_HREF).toBe(
      `${VITE_DEVTOOLS_DOC_HREF}#vite-cli-build-profiling`,
    );
    expect(VITE_DEVTOOLS_DOC_QUICK_REF_HREF).toBe(
      `${VITE_DEVTOOLS_DOC_HREF}#quick-reference`,
    );
    expect(LOCAL_SERVICES_PORTS_SERVICES_TABLE_HREF).toBe(
      `${LOCAL_SERVICES_PORTS_DOC_HREF}#services-to-expose`,
    );
  });

  test('anchor hrefs start with their base href', () => {
    expect(
      VITE_DEVTOOLS_DOC_PROFILING_HREF.startsWith(VITE_DEVTOOLS_DOC_HREF),
    ).toBe(true);
    expect(
      LOCAL_SERVICES_PORTS_SERVICES_TABLE_HREF.startsWith(
        LOCAL_SERVICES_PORTS_DOC_HREF,
      ),
    ).toBe(true);
  });
});
