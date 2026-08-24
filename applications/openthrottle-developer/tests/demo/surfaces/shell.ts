/**
 * @description Typeset a shell — and an agent CLI running inside one — as HTML for
 * the recording browser.
 *
 * Why a surface and not a real terminal: the runner captures a CDP screencast of one
 * chromium page (`runner/run.ts`), and the spike settled that on purpose — macOS
 * screen capture hangs on an interactive permission grant and records the whole
 * desktop, scrollback included. A short whose subject is a command line therefore
 * gets typeset in the recording browser, exactly the way captions and cards already
 * are (`assemble/cards.ts`), and for the same reason: the frame then shares the
 * footage's font stack instead of visibly disagreeing with it.
 *
 * Three properties this buys, none of which a screen recording has:
 *
 * - The text on screen is real DOM, so `runner/run.ts`'s per-beat dump feeds
 *   `scan/leak-scan.ts` for free — a shell beat is gated like an app page.
 * - Every path, prompt and hostname is a parameter, so the frame shows a fictional
 *   machine by construction rather than by remembering to clean one up.
 * - Two takes are identical, because nothing on screen came from the host.
 *
 * Every interpolated string is HTML-escaped: surface text comes from a flow and from
 * the product's own renderers, and neither should be able to put markup in the frame.
 */

import { loadFormat } from '../runner/format';

/**
 * One addressable run of output.
 *
 * Output is split into parts so a beat can `highlight` the ONE line the narration is
 * talking about. `pnpm run setup:mcp-instructions` prints instructions for two
 * clients and the short is about one of them, so highlighting the whole block would
 * point at the wrong thing — and a 9:16 crop of the whole block is unreadable.
 */
export interface ShellOutputPart {
  readonly id: string;
  readonly text: string;
}

export interface ShellBlock {
  /**
   * The command on the prompt line.
   *
   * Left empty when the flow TYPES it: the prompt renders an empty caret-bearing
   * span for the `type` verb to fill, which is what makes the beat read as someone
   * at a keyboard rather than a cut to a finished screen.
   */
  readonly command?: string;
  /** Hide the whole block until a `reveal` step brings it on screen. */
  readonly hidden?: boolean;
  /** Element id stem: `#<id>-command` is typed into, `#<id>-output` is revealed. */
  readonly id: string;
  /**
   * Prompt sigil, replacing the `<cwd> \u276f` shell prompt.
   *
   * This is what lets one builder render both a shell and an agent CLI running
   * inside it: the CLI's prompt is not the shell's, and a short that cuts from one
   * to the other has to show that or the restart beat means nothing.
   */
  readonly marker?: string;
  /**
   * What the command printed. Rendered verbatim, whitespace preserved.
   *
   * A plain string when nothing needs to be addressed inside it; a list of parts
   * when a beat has to highlight or crop to one run of the output.
   */
  readonly output?: readonly ShellOutputPart[] | string;
  /** Hide only the output, so the command can be typed and then "run". */
  readonly outputHidden?: boolean;
}

export interface ShellSurfaceOptions {
  /** Text above the first block — a CLI's startup banner, typically. */
  readonly banner?: string;
  readonly blocks: readonly ShellBlock[];
  /**
   * The directory name in the prompt. A NAME, not a path — a prompt is the easiest
   * place in a whole short to leak a home directory, and there is no reason for the
   * frame to carry one.
   */
  readonly cwd: string;
  /** Window title bar text. */
  readonly title: string;
}

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

/**
 * The window chrome and type scale.
 *
 * Sized for a 1920x1080 capture at `deviceScaleFactor: 2`, and deliberately larger
 * than a real terminal's default: a 9:16 crop of this is the constraint, and text
 * that is comfortable on a desktop is unreadable on a phone.
 */
const stylesheet = (brand: Readonly<Record<string, string>>): string => `
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;height:100%;background:${brand.background};
    color:${brand.foreground};font-family:${brand.sans}}
  [data-demo-hidden]{display:none !important}
  .frame{height:100%;display:flex;align-items:stretch;justify-content:center;padding:48px}
  .window{flex:1;display:flex;flex-direction:column;min-width:0;
    background:${brand.card};border:1px solid ${brand.border};border-radius:14px;overflow:hidden;
    box-shadow:0 24px 64px rgba(0,0,0,.5)}
  .titlebar{display:flex;align-items:center;gap:12px;padding:16px 20px;
    background:${brand.background};border-bottom:1px solid ${brand.border}}
  .dot{width:13px;height:13px;border-radius:50%;background:${brand.border}}
  .titlebar .name{margin-left:8px;font-size:19px;color:${brand.muted};letter-spacing:.01em}
  .body{flex:1;overflow:auto;padding:26px 30px;font-family:${brand.mono};
    font-size:25px;line-height:1.5}
  .block{margin:0 0 22px}
  .promptline{display:flex;gap:14px;align-items:baseline;flex-wrap:wrap}
  .cwd{color:#4ADE80;font-weight:700}
  .chev{color:${brand.muted}}
  .command{color:${brand.foreground};outline:none;white-space:pre-wrap;
    border-bottom:2px solid transparent;min-width:8px}
  .command:empty::after{content:'';display:inline-block;width:13px;height:1.1em;
    vertical-align:-.18em;background:${brand.foreground};opacity:.85}
  /* overflow-wrap:anywhere, not just pre-wrap: the add-json command line is one
     unbroken token with no space to break at, and it ran off the right edge. */
  .output{margin:14px 0 0;white-space:pre-wrap;overflow-wrap:anywhere;
    color:${brand.foreground};font-family:${brand.mono};font-size:23px;line-height:1.45}
  /* One line of leading between output parts. HTML strips a pre's trailing newline,
     so a split output loses the blank line that separated the parts in the text. */
  .output + .output{margin-top:1.45em}
  .banner{margin:0 0 26px;padding:0 0 22px;white-space:pre-wrap;color:${brand.muted};
    font-family:${brand.mono};font-size:23px;line-height:1.45;
    border-bottom:1px solid ${brand.border}}
`;

const renderOutput = (block: ShellBlock): string => {
  if (block.output === undefined) {
    return '';
  }

  const parts =
    typeof block.output === 'string'
      ? [`<pre class="output">${escapeHtml(block.output)}</pre>`]
      : block.output.map(
          (part) =>
            `<pre class="output" id="${part.id}">${escapeHtml(part.text)}</pre>`,
        );

  // The wrapper always carries `<id>-output`, so `reveal('#<id>-output')` reads the
  // same in a flow whether the output was split into parts or not.
  return `<div id="${block.id}-output"${
    block.outputHidden ? ' data-demo-hidden' : ''
  }>${parts.join('')}</div>`;
};

const renderBlock = (block: ShellBlock, cwd: string): string => {
  const output = renderOutput(block);

  return `<div class="block" id="${block.id}"${block.hidden ? ' data-demo-hidden' : ''}>
      <div class="promptline">
        ${
          block.marker === undefined
            ? `<span class="cwd">${escapeHtml(cwd)}</span><span class="chev">&#10095;</span>`
            : `<span class="chev">${escapeHtml(block.marker)}</span>`
        }
        <span class="command" id="${block.id}-command" contenteditable="true" spellcheck="false">${escapeHtml(
          block.command ?? '',
        )}</span>
      </div>
      ${output}
    </div>`;
};

/**
 * A shell window with one block per command.
 *
 * `contenteditable` on the command span rather than an `<input>`: the `type` verb
 * clicks its target and then types with per-character jitter, and an input would
 * clip a long command to one scrolling line instead of wrapping it — a
 * `claude mcp add-json` command line is long, and the whole point of the beat is
 * that the viewer can read it.
 */
export const shellSurface = (options: ShellSurfaceOptions): string => {
  const { brand } = loadFormat();

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
    <title>${escapeHtml(options.title)}</title>
    <style>${stylesheet(brand)}</style></head>
    <body><div class="frame"><div class="window">
      <div class="titlebar">
        <span class="dot"></span><span class="dot"></span><span class="dot"></span>
        <span class="name">${escapeHtml(options.title)}</span>
      </div>
      <div class="body" id="shell-body">
        ${
          options.banner === undefined
            ? ''
            : `<pre class="banner" id="shell-banner">${escapeHtml(options.banner)}</pre>`
        }
        ${options.blocks.map((block) => renderBlock(block, options.cwd)).join('\n')}
      </div>
    </div></div></body></html>`;
};
