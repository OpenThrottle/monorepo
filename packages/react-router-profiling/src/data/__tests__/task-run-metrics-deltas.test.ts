import { describe, expect, it } from 'vitest';
import { computeTaskRunDeltas } from '../task-run-metrics-deltas';

describe('computeTaskRunDeltas', () => {
  it('returns atEnd minus atStart for each field', () => {
    const atStart = {
      cpuSystemMs: 10,
      cpuUserMs: 100,
      externalMb: 1,
      heapTotalMb: 32,
      heapUsedMb: 20,
      rssMb: 50,
    };
    const atEnd = {
      cpuSystemMs: 25,
      cpuUserMs: 350,
      externalMb: 2.5,
      heapTotalMb: 36,
      heapUsedMb: 28,
      rssMb: 55,
    };
    const deltas = computeTaskRunDeltas(atStart, atEnd);
    expect(deltas.cpuSystemMs).toBe(15);
    expect(deltas.cpuUserMs).toBe(250);
    expect(deltas.externalMb).toBe(1.5);
    expect(deltas.heapTotalMb).toBe(4);
    expect(deltas.heapUsedMb).toBe(8);
    expect(deltas.rssMb).toBe(5);
  });

  it('returns zeros when atStart equals atEnd', () => {
    const snapshot = {
      cpuSystemMs: 0,
      cpuUserMs: 0,
      externalMb: 0,
      heapTotalMb: 0,
      heapUsedMb: 0,
      rssMb: 0,
    };
    const deltas = computeTaskRunDeltas(snapshot, snapshot);
    expect(deltas).toEqual(snapshot);
  });
});
