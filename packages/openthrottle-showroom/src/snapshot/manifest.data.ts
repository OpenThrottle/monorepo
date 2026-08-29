/**
 * @description THE committed classification of the entire database for the
 * snapshot export — every table is `exported | denied | ignored`, and every
 * column of an exported table is `keep | scrub | drop`, each with a reason.
 *
 * `assertManifestMatchesSchema` compares this file against the live schema
 * before an export writes anything, so a new migration fails the export with
 * an actionable message instead of silently leaking a new column.
 *
 * Written as the first draft of the deny list a public read-only guest
 * instance will need — classify conservatively: `scrub` any free text, `drop`
 * anything credential-adjacent, `denied` any table that stores secrets.
 */

import type { SnapshotManifest } from './manifest';

export const SNAPSHOT_MANIFEST: SnapshotManifest = {
  agent_conversation_messages: {
    classification: 'exported',
    columns: {
      content: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      conversation_id: { action: 'keep', reason: 'structural (uuid)' },
      created_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      id: { action: 'keep', reason: 'structural (uuid)' },
      role: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      routing_confidence: {
        action: 'keep',
        reason: 'structural (double precision)',
      },
      routing_model: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      routing_reason: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      routing_tier: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      sort_order: { action: 'keep', reason: 'structural (integer)' },
      tool_metadata: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (jsonb)',
      },
    },
    reason: 'chat transcripts rendered by the conversation surfaces',
  },
  agent_conversations: {
    classification: 'exported',
    columns: {
      created_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      id: { action: 'keep', reason: 'structural (uuid)' },
      metadata: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (jsonb)',
      },
      model_name: { action: 'keep', reason: 'structural (text)' },
      model_provider: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      plan_id: { action: 'keep', reason: 'structural (uuid)' },
      project_id: { action: 'keep', reason: 'structural (uuid)' },
      status: { action: 'keep', reason: 'structural (text)' },
      title: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      updated_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      user_id: { action: 'keep', reason: 'structural (uuid)' },
    },
    reason: 'conversation list and chat detail surfaces',
  },
  agent_token_usage: {
    classification: 'exported',
    columns: {
      cached_read_tokens: {
        action: 'keep',
        reason: 'token count — a number, not a credential',
      },
      cached_write_tokens: {
        action: 'keep',
        reason: 'token count — a number, not a credential',
      },
      conversation_id: { action: 'keep', reason: 'structural (uuid)' },
      cost_usd: { action: 'keep', reason: 'structural (numeric(12,6))' },
      created_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      id: { action: 'keep', reason: 'structural (uuid)' },
      input_tokens: {
        action: 'keep',
        reason: 'token count — a number, not a credential',
      },
      message_id: { action: 'keep', reason: 'structural (uuid)' },
      model: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      output_tokens: {
        action: 'keep',
        reason: 'token count — a number, not a credential',
      },
      provider: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      raw_usage: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (jsonb)',
      },
      reasoning_tokens: {
        action: 'keep',
        reason: 'token count — a number, not a credential',
      },
      total_tokens: {
        action: 'keep',
        reason: 'token count — a number, not a credential',
      },
      user_id: { action: 'keep', reason: 'structural (uuid)' },
    },
    reason: 'token/cost badges on conversations',
  },
  code_embeddings: {
    classification: 'denied',
    reason:
      'the code index spans arbitrary local workspaces, including private repositories — never export; the demo re-indexes its own checkout',
  },
  code_index_snapshots: {
    classification: 'ignored',
    reason:
      'code-index bookkeeping — the demo re-indexes from its own checkout',
  },
  custom_prompt_embeddings: {
    classification: 'exported',
    columns: {
      content: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      created_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      custom_prompt_id: { action: 'keep', reason: 'structural (uuid)' },
      embedding: {
        action: 'keep',
        reason:
          'embedding vector — embedded text is kept, so the vector stays valid',
        vectorDimension: 1536,
      },
      id: { action: 'keep', reason: 'structural (uuid)' },
      metadata: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (jsonb)',
      },
    },
    reason: 'semantic search over the prompt library',
  },
  custom_prompts: {
    classification: 'exported',
    columns: {
      content: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      created_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      deleted_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      description: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      file_path: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      id: { action: 'keep', reason: 'structural (uuid)' },
      labels: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (jsonb)',
      },
      project_id: { action: 'keep', reason: 'structural (uuid)' },
      prompt_type: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      title: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      updated_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      user_id: { action: 'keep', reason: 'structural (uuid)' },
    },
    reason: 'prompt library surface',
  },
  daily_stats: {
    classification: 'exported',
    columns: {
      created_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      date: { action: 'keep', reason: 'structural (date)' },
      id: { action: 'keep', reason: 'structural (uuid)' },
      plans_by_status: { action: 'keep', reason: 'structural (jsonb)' },
      plans_completed: { action: 'keep', reason: 'structural (integer)' },
      plans_created: { action: 'keep', reason: 'structural (integer)' },
      plans_updated: { action: 'keep', reason: 'structural (integer)' },
      tasks_by_status: { action: 'keep', reason: 'structural (jsonb)' },
      tasks_completed: { action: 'keep', reason: 'structural (integer)' },
      tasks_created: { action: 'keep', reason: 'structural (integer)' },
      tasks_updated: { action: 'keep', reason: 'structural (integer)' },
    },
    reason: 'dashboard activity chart',
  },
  doc_ingestion_state: {
    classification: 'ignored',
    reason: 'ingest cursor bookkeeping — the demo ingests from scratch',
  },
  documentation: {
    classification: 'exported',
    columns: {
      authors: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (jsonb)',
      },
      content: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      created_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      id: { action: 'keep', reason: 'structural (uuid)' },
      message: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      path: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      pr_number: { action: 'keep', reason: 'structural (integer)' },
      repo: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      sha: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
    },
    reason: 'docs knowledge base behind semantic search',
  },
  documentation_embeddings: {
    classification: 'exported',
    columns: {
      content: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      created_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      documentation_id: { action: 'keep', reason: 'structural (uuid)' },
      embedding: {
        action: 'keep',
        reason:
          'embedding vector — embedded text is kept, so the vector stays valid',
        vectorDimension: 1536,
      },
      id: { action: 'keep', reason: 'structural (uuid)' },
      metadata: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (jsonb)',
      },
    },
    reason: 'semantic docs-search corpus (episode 07)',
  },
  mcp_connector_connections: {
    classification: 'denied',
    reason:
      'stores per-user MCP connector credentials/config — never leaves the workspace',
  },
  notes: {
    classification: 'ignored',
    reason:
      'not FK-reachable from the export roots; the hero seed authors its own notes',
  },
  permissions: {
    classification: 'ignored',
    reason:
      'auth plumbing — migrations create permissions, the demo seed assigns roles',
  },
  plan_embeddings: {
    classification: 'exported',
    columns: {
      content: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      created_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      embedding: {
        action: 'keep',
        reason:
          'embedding vector — embedded text is kept, so the vector stays valid',
        vectorDimension: 1536,
      },
      id: { action: 'keep', reason: 'structural (uuid)' },
      metadata: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (jsonb)',
      },
      plan_id: { action: 'keep', reason: 'structural (uuid)' },
    },
    reason: 'semantic plan search',
  },
  plan_output_stream: {
    classification: 'exported',
    columns: {
      content: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      created_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      id: { action: 'keep', reason: 'structural (uuid)' },
      iteration: { action: 'keep', reason: 'structural (integer)' },
      plan_id: { action: 'keep', reason: 'structural (uuid)' },
      task_id: { action: 'keep', reason: 'structural (uuid)' },
    },
    reason: 'run output replay on plan detail',
  },
  plan_runs: {
    classification: 'exported',
    columns: {
      actor_user_id: { action: 'keep', reason: 'structural (uuid)' },
      branch: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      bullmq_job_id: { action: 'keep', reason: 'structural (text)' },
      cancel_requested_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      cancel_requested_by: { action: 'keep', reason: 'structural (uuid)' },
      checkout_id: { action: 'keep', reason: 'structural (uuid)' },
      created_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      execution_backend: { action: 'keep', reason: 'structural (text)' },
      hostname: {
        action: 'scrub',
        reason: 'machine hostname — collapses to the demo hostname',
      },
      id: { action: 'keep', reason: 'structural (uuid)' },
      last_heartbeat_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      model: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      pid: { action: 'keep', reason: 'structural (integer)' },
      plan_id: { action: 'keep', reason: 'structural (uuid)' },
      queue_name: { action: 'keep', reason: 'structural (text)' },
      run_config_snapshot: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (jsonb)',
      },
      run_kind: { action: 'keep', reason: 'structural (text)' },
      status: { action: 'keep', reason: 'structural (text)' },
      updated_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      worker_id: { action: 'keep', reason: 'structural (text)' },
    },
    reason: 'run badges and run detail surfaces',
  },
  plan_tags: {
    classification: 'exported',
    columns: {
      confidence: { action: 'keep', reason: 'structural (numeric)' },
      created_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      dimension: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      id: { action: 'keep', reason: 'structural (uuid)' },
      plan_id: { action: 'keep', reason: 'structural (uuid)' },
      source: { action: 'keep', reason: 'structural (text)' },
      tag: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      updated_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
    },
    reason: 'tag chips and tag filters on plans',
  },
  plans: {
    classification: 'exported',
    columns: {
      assignee: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      author: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      category: { action: 'keep', reason: 'structural (text)' },
      completed_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      created_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      description: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      id: { action: 'keep', reason: 'structural (uuid)' },
      job_run_hooks: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (jsonb)',
      },
      project: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      project_id: { action: 'keep', reason: 'structural (uuid)' },
      run_config: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (jsonb)',
      },
      status: { action: 'keep', reason: 'structural (plan_task_status)' },
      summary: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      title: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      updated_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      working_directory: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
    },
    reason: 'the core planning surface',
  },
  project_skills: {
    classification: 'ignored',
    reason: 'workspace tuning, not FK-reachable from the export roots',
  },
  project_tags: {
    classification: 'ignored',
    reason: 'workspace tuning, not FK-reachable from the export roots',
  },
  projects: {
    classification: 'exported',
    columns: {
      created_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      description: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      id: { action: 'keep', reason: 'structural (uuid)' },
      name: { action: 'keep', reason: 'structural (text)' },
      nx_project_name: { action: 'keep', reason: 'structural (text)' },
      updated_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
    },
    reason: 'FK parent of most surfaces; workspace scaffolding',
  },
  repositories: {
    classification: 'exported',
    columns: {
      created_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      default_branch: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      id: { action: 'keep', reason: 'structural (uuid)' },
      name: { action: 'keep', reason: 'structural (text)' },
      normalized_remote_url: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      project_id: { action: 'keep', reason: 'structural (uuid)' },
      updated_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
    },
    reason: 'repositories settings surface',
  },
  repository_checkouts: {
    classification: 'exported',
    columns: {
      created_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      display_name: { action: 'keep', reason: 'structural (text)' },
      filesystem_path: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      foreign_skill_injection_enabled: {
        action: 'keep',
        reason: 'structural (boolean)',
      },
      id: { action: 'keep', reason: 'structural (uuid)' },
      inspection: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (jsonb)',
      },
      kind: { action: 'keep', reason: 'structural (text)' },
      managed: { action: 'keep', reason: 'structural (boolean)' },
      repository_id: { action: 'keep', reason: 'structural (uuid)' },
      scanned_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      updated_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      user_id: { action: 'keep', reason: 'structural (uuid)' },
    },
    reason: 'worktree and checkout surfaces',
  },
  role_permissions: {
    classification: 'ignored',
    reason: 'auth plumbing — migrations create the role/permission matrix',
  },
  roles: {
    classification: 'ignored',
    reason:
      'auth plumbing — migrations create roles, the demo seed assigns them',
  },
  rollout_flags: {
    classification: 'ignored',
    reason: 'environment-specific feature flags — the demo uses defaults',
  },
  rule_applications: {
    classification: 'exported',
    columns: {
      created_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      details: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (jsonb)',
      },
      id: { action: 'keep', reason: 'structural (uuid)' },
      plan_id: { action: 'keep', reason: 'structural (uuid)' },
      rule_id: { action: 'keep', reason: 'structural (uuid)' },
      state: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      task_id: { action: 'keep', reason: 'structural (uuid)' },
      updated_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
    },
    reason: 'tag-rule activity surface',
  },
  scheduled_agent_job_runs: {
    classification: 'exported',
    columns: {
      bullmq_job_id: { action: 'keep', reason: 'structural (text)' },
      cache_read_tokens: {
        action: 'keep',
        reason: 'token count — a number, not a credential',
      },
      cache_write_tokens: {
        action: 'keep',
        reason: 'token count — a number, not a credential',
      },
      cancel_requested_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      cost_usd: { action: 'keep', reason: 'structural (numeric(12,6))' },
      created_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      driver_id: { action: 'keep', reason: 'structural (text)' },
      error_message: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      exit_code: { action: 'keep', reason: 'structural (integer)' },
      finished_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      id: { action: 'keep', reason: 'structural (uuid)' },
      input_tokens: {
        action: 'keep',
        reason: 'token count — a number, not a credential',
      },
      model: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      output_tokens: {
        action: 'keep',
        reason: 'token count — a number, not a credential',
      },
      raw_usage: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (jsonb)',
      },
      reasoning_tokens: {
        action: 'keep',
        reason: 'token count — a number, not a credential',
      },
      repository_checkout_id: { action: 'keep', reason: 'structural (uuid)' },
      resolved_cwd: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      scheduled_agent_job_id: { action: 'keep', reason: 'structural (uuid)' },
      settings_snapshot: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (jsonb)',
      },
      started_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      status: { action: 'keep', reason: 'structural (text)' },
      total_tokens: {
        action: 'keep',
        reason: 'token count — a number, not a credential',
      },
      trigger: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
    },
    reason: 'scheduled-job run history',
  },
  scheduled_agent_jobs: {
    classification: 'exported',
    columns: {
      created_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      cron_pattern: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      cwd: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      driver_id: { action: 'keep', reason: 'structural (text)' },
      enabled: { action: 'keep', reason: 'structural (boolean)' },
      id: { action: 'keep', reason: 'structural (uuid)' },
      last_run_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      model: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      name: { action: 'keep', reason: 'structural (text)' },
      next_run_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      owner_user_id: { action: 'keep', reason: 'structural (uuid)' },
      prompt: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      repository_checkout_id: { action: 'keep', reason: 'structural (uuid)' },
      scheduler_key: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      settings: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (jsonb)',
      },
      timeout_ms: { action: 'keep', reason: 'structural (integer)' },
      timezone: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      updated_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
    },
    reason: 'scheduled jobs surface',
  },
  schema_migrations: {
    classification: 'ignored',
    reason: 'migration ledger — the demo database runs its own migrations',
  },
  service_account_credentials: {
    classification: 'denied',
    reason:
      'hashed service-account credentials — credential-adjacent, never exported',
  },
  service_account_roles: {
    classification: 'ignored',
    reason: 'auth plumbing for service accounts — not needed on camera',
  },
  service_accounts: {
    classification: 'exported',
    columns: {
      acting_user_id: { action: 'keep', reason: 'structural (uuid)' },
      created_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      description: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      disabled_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      id: { action: 'keep', reason: 'structural (uuid)' },
      name: { action: 'keep', reason: 'structural (text)' },
    },
    reason: 'integrity parent of work_sessions actors',
  },
  skill_availability_rule_sets: {
    classification: 'ignored',
    reason: 'skill-availability tuning — not needed on camera',
  },
  skill_availability_rules: {
    classification: 'ignored',
    reason: 'skill-availability tuning — not needed on camera',
  },
  skill_usage_events: {
    classification: 'exported',
    columns: {
      agent_id: { action: 'keep', reason: 'structural (text)' },
      agent_type: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      args: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      cwd: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      git_branch: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      hook_event_name: { action: 'keep', reason: 'structural (text)' },
      id: { action: 'keep', reason: 'structural (uuid)' },
      invocation_path: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      occurred_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      privacy_level: { action: 'keep', reason: 'structural (text)' },
      prompt_id: { action: 'keep', reason: 'structural (text)' },
      received_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      scope: { action: 'keep', reason: 'structural (text)' },
      session_id: { action: 'keep', reason: 'structural (text)' },
      skill_name: { action: 'keep', reason: 'structural (text)' },
      source: { action: 'keep', reason: 'structural (text)' },
      tool_use_id: { action: 'keep', reason: 'structural (text)' },
    },
    reason: 'skills usage analytics surfaces',
  },
  skill_usage_outcomes: {
    classification: 'ignored',
    reason:
      'no FK to skill_usage_events, so unreachable mechanically — revisit if an episode needs outcomes',
  },
  subscriptions: {
    classification: 'denied',
    reason: 'web-push subscriptions carry per-device endpoint secrets/keys',
  },
  tag_action_rules: {
    classification: 'exported',
    columns: {
      action_payload: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (jsonb)',
      },
      action_type: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      created_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      enabled: { action: 'keep', reason: 'structural (boolean)' },
      environment: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      id: { action: 'keep', reason: 'structural (uuid)' },
      project_id: { action: 'keep', reason: 'structural (uuid)' },
      status: { action: 'keep', reason: 'structural (plan_task_status)' },
      tag_all: { action: 'keep', reason: 'structural (text[])' },
      title: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      updated_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      user_id: { action: 'keep', reason: 'structural (uuid)' },
    },
    reason: 'tag rules surface',
  },
  task_embeddings: {
    classification: 'exported',
    columns: {
      content: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      created_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      embedding: {
        action: 'keep',
        reason:
          'embedding vector — embedded text is kept, so the vector stays valid',
        vectorDimension: 1536,
      },
      id: { action: 'keep', reason: 'structural (uuid)' },
      metadata: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (jsonb)',
      },
      task_id: { action: 'keep', reason: 'structural (uuid)' },
    },
    reason: 'semantic task search',
  },
  task_tags: {
    classification: 'exported',
    columns: {
      confidence: { action: 'keep', reason: 'structural (numeric)' },
      created_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      dimension: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      id: { action: 'keep', reason: 'structural (uuid)' },
      source: { action: 'keep', reason: 'structural (text)' },
      tag: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      task_id: { action: 'keep', reason: 'structural (uuid)' },
      updated_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
    },
    reason: 'tag chips and tag filters on tasks',
  },
  tasks: {
    classification: 'exported',
    columns: {
      assignee: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      category: { action: 'keep', reason: 'structural (text)' },
      completed_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      created_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      description: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      hook_role: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      hook_scope: { action: 'keep', reason: 'structural (text)' },
      hook_source: { action: 'keep', reason: 'structural (text)' },
      id: { action: 'keep', reason: 'structural (uuid)' },
      parent_task_id: { action: 'keep', reason: 'structural (uuid)' },
      plan_id: { action: 'keep', reason: 'structural (uuid)' },
      project: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      project_id: { action: 'keep', reason: 'structural (uuid)' },
      requirements: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (jsonb)',
      },
      skill_slug: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      sort_order: { action: 'keep', reason: 'structural (integer)' },
      status: { action: 'keep', reason: 'structural (plan_task_status)' },
      summary: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      title: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      updated_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
    },
    reason: 'plan detail task tables',
  },
  user_disabled_agent_clis: {
    classification: 'ignored',
    reason: 'per-user preference — the demo user configures its own',
  },
  user_favorite_agent_models: {
    classification: 'ignored',
    reason: 'per-user preference — the demo user configures its own',
  },
  user_roles: {
    classification: 'ignored',
    reason: 'auth plumbing — the demo seed assigns roles to the demo user',
  },
  user_skill_tags: {
    classification: 'ignored',
    reason: 'per-user preference — the demo user configures its own',
  },
  user_workspace_settings: {
    classification: 'ignored',
    reason: 'per-user preference — the demo user configures its own',
  },
  users: {
    classification: 'exported',
    columns: {
      created_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      disabled_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      email: {
        action: 'scrub',
        reason: 'identity — mapped to the demo domain',
      },
      github_username: {
        action: 'keep',
        reason:
          'kept deliberately — the repo is public and the workspace is expected to become public',
      },
      id: { action: 'keep', reason: 'structural (uuid)' },
      password_hash: {
        action: 'drop',
        reason: 'credential — never exported; the demo seed sets its own',
      },
      updated_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
    },
    reason: 'integrity parent everywhere; identity columns scrubbed or dropped',
  },
  work_artifacts: {
    classification: 'exported',
    columns: {
      created_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      external_key: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      id: { action: 'keep', reason: 'structural (uuid)' },
      lifecycle: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      message: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      payload: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (jsonb)',
      },
      produced_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      session_id: { action: 'keep', reason: 'structural (uuid)' },
      source: { action: 'keep', reason: 'structural (text)' },
      type: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      verification: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      verified_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
    },
    reason: 'work ledger artifact rows',
  },
  work_session_subjects: {
    classification: 'exported',
    columns: {
      attached_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      id: { action: 'keep', reason: 'structural (uuid)' },
      plan_id: { action: 'keep', reason: 'structural (uuid)' },
      session_id: { action: 'keep', reason: 'structural (uuid)' },
      task_id: { action: 'keep', reason: 'structural (uuid)' },
    },
    reason: 'work ledger plan/task links',
  },
  work_sessions: {
    classification: 'exported',
    columns: {
      actor_service_account_id: { action: 'keep', reason: 'structural (uuid)' },
      actor_user_id: { action: 'keep', reason: 'structural (uuid)' },
      closed_by: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      conversation_id: { action: 'keep', reason: 'structural (uuid)' },
      created_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      ended_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      external_ref: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      id: { action: 'keep', reason: 'structural (uuid)' },
      model: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      on_behalf_of_user_id: { action: 'keep', reason: 'structural (uuid)' },
      on_behalf_of_verified: { action: 'keep', reason: 'structural (boolean)' },
      plan_run_id: { action: 'keep', reason: 'structural (uuid)' },
      started_at: {
        action: 'keep',
        reason: 'structural (timestamp with time zone)',
      },
      summary: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
      tool_name: { action: 'keep', reason: 'structural (text)' },
      tool_version: {
        action: 'scrub',
        reason: 'free text — identity/secret pass (text)',
      },
    },
    reason: 'work ledger sessions',
  },
};
