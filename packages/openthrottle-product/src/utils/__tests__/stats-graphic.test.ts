import { describe, expect, it } from 'vitest';

import { STATS_GRAPHIC_LAYOUT } from '../../data/stats-graphic';
import type { SurfaceStats } from '../../types/surfaces';
import {
  escapeXml,
  getAgentCliNames,
  getStatsGraphicChips,
  measureText,
  renderStatsAlt,
  renderStatsSvg,
} from '../stats-graphic';

const AGENTS = [
  'Claude Code',
  'Codex',
  'Cursor',
  'Grok',
  'OpenCode',
  'Antigravity',
] as const;

const stats: SurfaceStats = {
  agentClis: AGENTS,
  applications: 8,
  mergedPullRequests: 769,
  packages: 74,
};

describe('getAgentCliNames', () => {
  it('puts the curated order first, whatever order the drivers come in', () => {
    const ids = [
      'antigravity',
      'claude',
      'codex',
      'cursor',
      'grok',
      'opencode',
    ];

    expect(getAgentCliNames(ids)).toEqual(AGENTS);
  });

  it('appends a driver with no curated position, by its id', () => {
    expect(getAgentCliNames(['newcli', 'codex'])).toEqual(['Codex', 'newcli']);
  });

  it('omits curated drivers that are not registered', () => {
    expect(getAgentCliNames(['grok'])).toEqual(['Grok']);
  });
});

describe('escapeXml', () => {
  it('escapes markup characters', () => {
    expect(escapeXml('<a & "b">')).toBe('&lt;a &amp; &quot;b&quot;&gt;');
  });
});

describe('measureText', () => {
  it('measures wide names wider than narrow names of the same length', () => {
    expect(measureText('mmmm', 20)).toBeGreaterThan(measureText('iiii', 20));
  });
});

describe('getStatsGraphicChips', () => {
  const chips = getStatsGraphicChips(AGENTS);

  it('keeps the given order', () => {
    expect(
      chips.map((chip) => {
        return chip.name;
      }),
    ).toEqual(AGENTS);
  });

  it('ends the last chip inside the card margin', () => {
    const last = chips.at(-1);
    const limit = STATS_GRAPHIC_LAYOUT.width - STATS_GRAPHIC_LAYOUT.margin;

    expect(last).toBeDefined();
    expect((last?.x ?? 0) + (last?.width ?? 0)).toBeLessThanOrEqual(limit);
  });

  it('leaves right padding past the measured text', () => {
    for (const chip of chips) {
      const textEnd =
        chip.x +
        STATS_GRAPHIC_LAYOUT.chipTextX +
        measureText(chip.name, STATS_GRAPHIC_LAYOUT.chipFontSize);

      expect(chip.x + chip.width - textEnd).toBe(
        STATS_GRAPHIC_LAYOUT.chipPaddingRight,
      );
    }
  });
});

describe('renderStatsSvg', () => {
  const dark = renderStatsSvg(stats, 'dark');
  const light = renderStatsSvg(stats, 'light');

  it('renders the generated numbers', () => {
    for (const value of ['769+', '>74<', '>8<', '>6<']) {
      expect(dark).toContain(value);
    }
  });

  it('renders a chip per agent CLI', () => {
    for (const name of AGENTS) {
      expect(dark).toContain(`>${name}</text>`);
    }
  });

  it('is a 1280x290 standalone SVG', () => {
    expect(dark).toMatch(
      /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" width="1280" height="290"/,
    );
  });

  it('uses a different palette per scheme', () => {
    expect(dark).not.toBe(light);
    expect(dark).toContain('#0A0D0F');
    expect(light).toContain('#FFFFFF');
  });

  it('escapes agent names', () => {
    const svg = renderStatsSvg({ ...stats, agentClis: ['A<B'] }, 'dark');

    expect(svg).toContain('A&lt;B');
    expect(svg).not.toContain('A<B');
  });
});

describe('renderStatsAlt', () => {
  it('carries every number and agent name', () => {
    expect(renderStatsAlt(stats)).toBe(
      `769+ pull requests merged, 74 packages, 8 applications, 6 agent CLIs: Claude Code, Codex, Cursor, Grok, OpenCode and Antigravity.`,
    );
  });

  it('reads naturally with one agent CLI', () => {
    expect(renderStatsAlt({ ...stats, agentClis: ['Codex'] })).toContain(
      '1 agent CLIs: Codex.',
    );
  });
});
