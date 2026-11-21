import { parseListeningOrigin } from './parseListeningOrigin.ts';

describe('parseListeningOrigin', () => {
  it('reads the origin from the listening line among other output', () => {
    const output = [
      '[1113/120000.1:INFO:CONSOLE] something',
      '[openthrottle-server] listening on http://127.0.0.1:53124',
      '[openthrottle-server] ready',
    ].join('\n');

    expect(parseListeningOrigin(output)).toBe('http://127.0.0.1:53124');
  });

  it('is undefined before the line arrives', () => {
    expect(parseListeningOrigin('[openthrottle-server] starting')).toBe(
      undefined,
    );
  });

  it('ignores a non-loopback origin', () => {
    expect(
      parseListeningOrigin(
        '[openthrottle-server] listening on http://0.0.0.0:53124',
      ),
    ).toBe(undefined);
  });
});
