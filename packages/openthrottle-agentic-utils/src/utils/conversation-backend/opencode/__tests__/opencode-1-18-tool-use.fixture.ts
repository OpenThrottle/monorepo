/**
 * A real `opencode run --format json` stream from opencode CLI 1.18.16
 * (model opencode/big-pickle), captured 2026-11-06 for OT plan 1e94607e. The
 * prompt asked for two parallel tool calls: `pwd` (completes) and a read of a
 * missing file (errors). The worktree path is replaced with `/repo`.
 *
 * Note what it shows: each tool call arrives as ONE `tool_use` event that is
 * already terminal — there is no running event before it.
 */
export const OPENCODE_1_18_TOOL_USE_EVENTS: readonly unknown[] = [
  {
    part: {
      id: 'prt_1af677f53001g4Tw790QWOq8zw',
      messageID: 'msg_1af674523001rI8GvUBrtW06hz',
      sessionID: 'ses_e5098bc7cffe6tw6pzKq0R3S7I',
      snapshot: 'be925e1a0f7a669be1f4b86cb108105d71258814',
      type: 'step-start',
    },
    sessionID: 'ses_e5098bc7cffe6tw6pzKq0R3S7I',
    timestamp: 1793944158037,
    type: 'step_start',
  },
  {
    part: {
      callID: 'call_07095c4b546840c6a0d6f087',
      id: 'prt_1af678b2b001H1qxTHmn8rGcmA',
      messageID: 'msg_1af674523001rI8GvUBrtW06hz',
      sessionID: 'ses_e5098bc7cffe6tw6pzKq0R3S7I',
      state: {
        input: {
          command: 'pwd',
        },
        metadata: {
          exit: 0,
          output: '/repo\n',
          truncated: false,
        },
        output: '/repo\n',
        status: 'completed',
        time: {
          end: 1793944161300,
          start: 1793944161296,
        },
        title: 'pwd',
      },
      tool: 'bash',
      type: 'tool',
    },
    sessionID: 'ses_e5098bc7cffe6tw6pzKq0R3S7I',
    timestamp: 1793944161301,
    type: 'tool_use',
  },
  {
    part: {
      callID: 'call_ba941736252943d99b845d8d',
      id: 'prt_1af678c16001otmpOhsj3n2xt9',
      messageID: 'msg_1af674523001rI8GvUBrtW06hz',
      sessionID: 'ses_e5098bc7cffe6tw6pzKq0R3S7I',
      state: {
        error: 'File not found: /repo/does-not-exist/missing.txt',
        input: {
          filePath: '/repo/does-not-exist/missing.txt',
        },
        status: 'error',
        time: {
          end: 1793944161969,
          start: 1793944161965,
        },
      },
      tool: 'read',
      type: 'tool',
    },
    sessionID: 'ses_e5098bc7cffe6tw6pzKq0R3S7I',
    timestamp: 1793944161971,
    type: 'tool_use',
  },
  {
    part: {
      cost: 0,
      id: 'prt_1af678fed001P3qZV2gm4q1n42',
      messageID: 'msg_1af674523001rI8GvUBrtW06hz',
      reason: 'tool-calls',
      sessionID: 'ses_e5098bc7cffe6tw6pzKq0R3S7I',
      snapshot: 'be925e1a0f7a669be1f4b86cb108105d71258814',
      tokens: {
        cache: {
          read: 1792,
          write: 0,
        },
        input: 47089,
        output: 104,
        reasoning: 0,
        total: 48985,
      },
      type: 'step-finish',
    },
    sessionID: 'ses_e5098bc7cffe6tw6pzKq0R3S7I',
    timestamp: 1793944162288,
    type: 'step_finish',
  },
  {
    part: {
      id: 'prt_1af67ad500012xFi6rcFW68vkw',
      messageID: 'msg_1af67908f001pZo8V0i8x4plI9',
      sessionID: 'ses_e5098bc7cffe6tw6pzKq0R3S7I',
      snapshot: 'be925e1a0f7a669be1f4b86cb108105d71258814',
      type: 'step-start',
    },
    sessionID: 'ses_e5098bc7cffe6tw6pzKq0R3S7I',
    timestamp: 1793944169810,
    type: 'step_start',
  },
  {
    part: {
      id: 'prt_1af67ad81001DqEaoJvs7yEVnD',
      messageID: 'msg_1af67908f001pZo8V0i8x4plI9',
      sessionID: 'ses_e5098bc7cffe6tw6pzKq0R3S7I',
      text: 'done',
      time: {
        end: 1793944169950,
        start: 1793944169857,
      },
      type: 'text',
    },
    sessionID: 'ses_e5098bc7cffe6tw6pzKq0R3S7I',
    timestamp: 1793944169952,
    type: 'text',
  },
  {
    part: {
      cost: 0,
      id: 'prt_1af67ae87001bd1S7rF0o80WGM',
      messageID: 'msg_1af67908f001pZo8V0i8x4plI9',
      reason: 'stop',
      sessionID: 'ses_e5098bc7cffe6tw6pzKq0R3S7I',
      snapshot: 'be925e1a0f7a669be1f4b86cb108105d71258814',
      tokens: {
        cache: {
          read: 48640,
          write: 0,
        },
        input: 436,
        output: 3,
        reasoning: 0,
        total: 49079,
      },
      type: 'step-finish',
    },
    sessionID: 'ses_e5098bc7cffe6tw6pzKq0R3S7I',
    timestamp: 1793944170122,
    type: 'step_finish',
  },
];
