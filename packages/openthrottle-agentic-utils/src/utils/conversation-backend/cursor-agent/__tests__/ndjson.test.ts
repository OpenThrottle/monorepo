import { describe, expect, it } from 'vitest';

import { NdjsonBuffer } from '../ndjson.js';

describe('NdjsonBuffer', () => {
  it('emits complete lines and holds a partial line until its newline arrives', () => {
    const buffer = new NdjsonBuffer();
    expect(buffer.push('{"a":1}\n{"b":2')).toEqual(['{"a":1}']);
    expect(buffer.push('}\n')).toEqual(['{"b":2}']);
  });

  it('splits multiple lines in a single chunk', () => {
    const buffer = new NdjsonBuffer();
    expect(buffer.push('a\nb\nc\n')).toEqual(['a', 'b', 'c']);
  });

  it('reassembles a line split across three chunks', () => {
    const buffer = new NdjsonBuffer();
    expect(buffer.push('{"hel')).toEqual([]);
    expect(buffer.push('lo":')).toEqual([]);
    expect(buffer.push('true}\n')).toEqual(['{"hello":true}']);
  });

  it('drops blank lines and strips a trailing carriage return', () => {
    const buffer = new NdjsonBuffer();
    expect(buffer.push('x\r\n\n\ny\n')).toEqual(['x', 'y']);
  });

  it('flush surfaces a final unterminated line, then nothing', () => {
    const buffer = new NdjsonBuffer();
    expect(buffer.push('{"done":true}')).toEqual([]);
    expect(buffer.flush()).toEqual(['{"done":true}']);
    expect(buffer.flush()).toEqual([]);
  });

  it('accepts Buffer chunks', () => {
    const buffer = new NdjsonBuffer();
    expect(buffer.push(Buffer.from('line\n', 'utf8'))).toEqual(['line']);
  });
});
