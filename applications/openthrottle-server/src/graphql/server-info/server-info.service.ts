/**
 * @description Application service for serverInfo: static facts about the running build.
 */

import { Injectable } from '@nestjs/common';

import type { ServerInfoObject } from './server-info.object.ts';
import { getServerVersion } from './server-info.utils.ts';

@Injectable()
export class ServerInfoService {
  /**
   * @description The server's package.json version.
   */
  getServerInfo(): ServerInfoObject {
    return { version: getServerVersion() };
  }
}
