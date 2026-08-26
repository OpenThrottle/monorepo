/**
 * @description macOS `say` backend.
 *
 * This is the REHEARSAL voice, not the ship voice. It is on every Mac, costs
 * nothing, and sends nothing off the box — which makes it perfect for building and
 * timing the pipeline. It is also audibly synthetic: the sample measured a loudness
 * range of 0.2 LU, i.e. almost no prosody, and only the base voice set is installed
 * (no Premium/Enhanced Siri voices). Shipping it would undercut the channel.
 *
 * See ../NARRATION.md for the backend comparison and the open ship-voice decision.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import type { RenderRequest, TtsBackend } from '../types';

const execFileAsync = promisify(execFile);

export const sayBackend: TtsBackend = {
  id: 'macos-say',
  render: async (request: RenderRequest): Promise<string> => {
    // `say` writes AIFF; asking it for other containers fails with "Opening output
    // file failed: fmt?". The narrate stage transcodes and normalises afterwards.
    const aiffPath = request.outputPath.replace(/\.wav$/, '.aiff');

    await execFileAsync('say', [
      '-v',
      request.voice,
      '-o',
      aiffPath,
      request.text,
    ]);

    return aiffPath;
  },
  sendsDataOffBox: false,
};
