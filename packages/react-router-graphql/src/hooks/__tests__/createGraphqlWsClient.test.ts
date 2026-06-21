import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const createClientMock = vi.fn();

vi.mock('graphql-ws', () => ({
  createClient: (...args: ReadonlyArray<unknown>): unknown =>
    createClientMock(...args),
}));

// `IS_BROWSER` is a module-evaluation-time const in
// `@openthrottle/react-router-utils`; mock it so each test can flip the
// SSR vs browser branch without depending on the jsdom global.
const isBrowserRef = { value: true };

vi.mock('@openthrottle/react-router-utils', () => ({
  get IS_BROWSER(): boolean {
    return isBrowserRef.value;
  },
}));

const { createGraphqlWsClient } = await import('../createGraphqlWsClient');

afterEach(() => vi.clearAllMocks());

describe('createGraphqlWsClient', () => {
  beforeEach(() => {
    isBrowserRef.value = true;
  });

  it('returns null during SSR without opening a socket', () => {
    isBrowserRef.value = false;

    const client = createGraphqlWsClient({ url: 'wss://example.test/graphql' });

    expect(client).toBeNull();
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('creates a lazy client by default in the browser', () => {
    const handle = { dispose: vi.fn() };
    createClientMock.mockReturnValue(handle);

    const client = createGraphqlWsClient({ url: 'wss://example.test/graphql' });

    expect(client).toBe(handle);
    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(createClientMock).toHaveBeenCalledWith({
      connectionParams: undefined,
      lazy: true,
      url: 'wss://example.test/graphql',
    });
  });

  it('forwards an explicit lazy=false and connectionParams', () => {
    createClientMock.mockReturnValue({});
    const connectionParams = { authToken: 't' };

    createGraphqlWsClient({
      connectionParams,
      lazy: false,
      url: 'wss://example.test/graphql',
    });

    expect(createClientMock).toHaveBeenCalledWith({
      connectionParams,
      lazy: false,
      url: 'wss://example.test/graphql',
    });
  });
});
