-- GENERATED — DO NOT EDIT. Regenerate: bash databases/openthrottle/old-schema/freeze.sh 143
-- openthrottle database after migration 143 (147 files), schema_migrations ledger included.

--
-- PostgreSQL database dump
--

\restrict openthrottleoldschema

-- Dumped from database version 18.4 (Debian 18.4-1.pgdg13+1)
-- Dumped by pg_dump version 18.4 (Debian 18.4-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


--
-- Name: EXTENSION vector; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';


--
-- Name: plan_task_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.plan_task_status AS ENUM (
    'BACKLOG',
    'BLOCKED',
    'CANCELED',
    'COMPLETED',
    'IN_PROGRESS',
    'QUEUED',
    'PENDING',
    'PROMOTED',
    'SKIPPED'
);


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: agent_conversation_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_conversation_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    sort_order integer NOT NULL,
    routing_tier text,
    routing_confidence double precision,
    routing_model text,
    routing_reason text,
    tool_metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT agent_conversation_messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text, 'tool'::text])))
);


--
-- Name: TABLE agent_conversation_messages; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.agent_conversation_messages IS 'Ordered messages within an agent conversation. sort_order is monotonic per conversation; user and assistant rows for a turn are written consecutively in one transaction.';


--
-- Name: COLUMN agent_conversation_messages.content; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_conversation_messages.content IS 'Message body (app cap 256KB on insert; truncate with metadata flag when clipped).';


--
-- Name: COLUMN agent_conversation_messages.sort_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_conversation_messages.sort_order IS 'Monotonic ordering within conversation (not gap-based). UNIQUE per conversation_id.';


--
-- Name: COLUMN agent_conversation_messages.routing_tier; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_conversation_messages.routing_tier IS 'Denormalized routing tier on assistant rows (e.g. from agentsRunChatTurn router).';


--
-- Name: COLUMN agent_conversation_messages.routing_confidence; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_conversation_messages.routing_confidence IS 'Denormalized routing confidence on assistant rows.';


--
-- Name: COLUMN agent_conversation_messages.routing_model; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_conversation_messages.routing_model IS 'Denormalized routing model identifier on assistant rows.';


--
-- Name: COLUMN agent_conversation_messages.routing_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_conversation_messages.routing_reason IS 'Denormalized routing reason on assistant rows.';


--
-- Name: COLUMN agent_conversation_messages.tool_metadata; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_conversation_messages.tool_metadata IS 'Capped JSONB audit of MCP tool turns on assistant rows (app cap 64KB; set truncated flag in envelope when clipped).';


--
-- Name: agent_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text,
    status text DEFAULT 'active'::text NOT NULL,
    plan_id uuid,
    project_id uuid,
    model_provider text,
    model_name text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT agent_conversations_status_check CHECK ((status = ANY (ARRAY['active'::text, 'archived'::text, 'deleted'::text])))
);


--
-- Name: TABLE agent_conversations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.agent_conversations IS 'User-scoped persisted agent/web chat threads for OpenThrottle. Archive-only lifecycle in v1 (status active|archived). Not used for Ralph plan_output_stream logs.';


--
-- Name: COLUMN agent_conversations.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_conversations.status IS 'Lifecycle: active (default), archived, or deleted. deleted is a soft-delete (row + messages retained, hidden from the default list; reversible, a later purge job may hard-delete). Enforced by agent_conversations_status_check.';


--
-- Name: COLUMN agent_conversations.plan_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_conversations.plan_id IS 'Optional link to an OpenThrottle plan; ON DELETE SET NULL when plan is removed.';


--
-- Name: COLUMN agent_conversations.project_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_conversations.project_id IS 'Optional link to an OpenThrottle project; ON DELETE SET NULL when project is removed.';


--
-- Name: COLUMN agent_conversations.model_provider; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_conversations.model_provider IS 'Last router LLM provider snapshot; updated on persist turns when router LLM runs; null for heuristic-only routing.';


--
-- Name: COLUMN agent_conversations.model_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_conversations.model_name IS 'Last router LLM model snapshot; updated on persist turns when router LLM runs; null for heuristic-only routing.';


--
-- Name: COLUMN agent_conversations.metadata; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_conversations.metadata IS 'Extensibility envelope (JSONB). Application validates shape and size.';


--
-- Name: agent_token_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_token_usage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    conversation_id uuid,
    message_id uuid,
    provider text NOT NULL,
    model text,
    input_tokens bigint,
    output_tokens bigint,
    cached_read_tokens bigint,
    cached_write_tokens bigint,
    reasoning_tokens bigint,
    total_tokens bigint,
    cost_usd numeric(12,6),
    raw_usage jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    source text,
    session_id text,
    request_id text,
    cwd text,
    git_branch text
);


--
-- Name: TABLE agent_token_usage; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.agent_token_usage IS 'Per-turn normalized token/cost usage for agent-CLI chat. One immutable row per persisted assistant turn (Private-mode turns write nothing). Decoupled from chat messages so future non-chat sources can also write here. v1 surfaces it on the developer Usage route.';


--
-- Name: COLUMN agent_token_usage.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_token_usage.user_id IS 'Owning user; every persisted turn has one. ON DELETE CASCADE. All reads are user-scoped by this column.';


--
-- Name: COLUMN agent_token_usage.conversation_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_token_usage.conversation_id IS 'Chat conversation the turn belonged to, when sourced from chat; ON DELETE SET NULL so usage totals survive conversation deletion. Null for non-chat sources.';


--
-- Name: COLUMN agent_token_usage.message_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_token_usage.message_id IS 'Assistant message the usage was folded from, when sourced from chat; ON DELETE SET NULL. Null for non-chat sources.';


--
-- Name: COLUMN agent_token_usage.provider; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_token_usage.provider IS 'Usage provider identity: run.provider ?? run.backend (driver id: claude|codex|cursor|grok|opencode|openai). Lowercased, never null.';


--
-- Name: COLUMN agent_token_usage.model; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_token_usage.model IS 'Model the usage is attributed to: backend-reported model (most accurate) else run.model. Null when unknown.';


--
-- Name: COLUMN agent_token_usage.input_tokens; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_token_usage.input_tokens IS 'Prompt/input tokens for the turn; null when the backend did not report it.';


--
-- Name: COLUMN agent_token_usage.output_tokens; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_token_usage.output_tokens IS 'Completion/output tokens for the turn; null when the backend did not report it.';


--
-- Name: COLUMN agent_token_usage.cached_read_tokens; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_token_usage.cached_read_tokens IS 'Tokens served from the prompt cache (claude cache_read_input_tokens, opencode cache.read); null when unreported.';


--
-- Name: COLUMN agent_token_usage.cached_write_tokens; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_token_usage.cached_write_tokens IS 'Tokens written to the prompt cache (claude cache_creation_input_tokens, opencode cache.write); null when unreported.';


--
-- Name: COLUMN agent_token_usage.reasoning_tokens; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_token_usage.reasoning_tokens IS 'Reasoning/thinking tokens accounted separately (opencode tokens.reasoning, grok usage.reasoning_tokens); null when unreported.';


--
-- Name: COLUMN agent_token_usage.total_tokens; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_token_usage.total_tokens IS 'Total tokens: the backend explicit total else input+output when either present; null when nothing reported.';


--
-- Name: COLUMN agent_token_usage.cost_usd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_token_usage.cost_usd IS 'Reported dollar cost of the turn when the backend prices it (claude totalCostUsd, opencode summed cost); null when unpriced.';


--
-- Name: COLUMN agent_token_usage.raw_usage; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_token_usage.raw_usage IS 'The turn''s normalized usage payload (NormalizedTokenUsage) as JSONB, retained for audit/debug and future re-derivation.';


--
-- Name: COLUMN agent_token_usage.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_token_usage.created_at IS 'Turn completion timestamp; the axis all Usage-route date-range filters and ordering use.';


--
-- Name: COLUMN agent_token_usage.source; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_token_usage.source IS 'Producer id of the writer that recorded this row: openthrottle-chat for OpenThrottle chat turns (ConversationStreamService), claude-code for rows ingested from a Claude Code hook. Free text, like skill_usage_events.source. Backfilled to openthrottle-chat by migration 135; capture health groups by COALESCE(NULLIF(source, ''''), provider).';


--
-- Name: COLUMN agent_token_usage.session_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_token_usage.session_id IS 'The agent harness''s own session string (for example a Claude Code session id). Not a foreign key to work_sessions. Null for chat rows.';


--
-- Name: COLUMN agent_token_usage.request_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_token_usage.request_id IS 'Provider API request id for the turn, the idempotency key for hook ingest: (source, session_id, request_id) is unique where request_id is not null, so a re-sent row is a no-op. Null for chat rows.';


--
-- Name: COLUMN agent_token_usage.cwd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_token_usage.cwd IS 'Working directory the harness reported when the turn ran. Null for chat rows.';


--
-- Name: COLUMN agent_token_usage.git_branch; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_token_usage.git_branch IS 'Git branch the harness reported when the turn ran. Null for chat rows.';


--
-- Name: blog_authors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blog_authors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    display_name text NOT NULL,
    bio text,
    avatar_url text,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_blog_authors_display_name CHECK ((length(btrim(display_name)) > 0)),
    CONSTRAINT chk_blog_authors_slug CHECK ((slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text))
);


--
-- Name: TABLE blog_authors; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.blog_authors IS 'Public byline identities for OpenThrottle blog posts. Separate from users because users only carries github_username/email, which must never be exposed on the public site, and guest authors have no user row.';


--
-- Name: COLUMN blog_authors.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.blog_authors.id IS 'Surrogate key.';


--
-- Name: COLUMN blog_authors.slug; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.blog_authors.slug IS 'Public, URL-safe author key. Lowercase kebab-case (chk_blog_authors_slug); unique via idx_blog_authors_slug.';


--
-- Name: COLUMN blog_authors.display_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.blog_authors.display_name IS 'Name shown in the byline. Non-empty (chk_blog_authors_display_name).';


--
-- Name: COLUMN blog_authors.bio; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.blog_authors.bio IS 'Short public biography shown alongside the byline. Optional.';


--
-- Name: COLUMN blog_authors.avatar_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.blog_authors.avatar_url IS 'Absolute URL of the author avatar image. Optional.';


--
-- Name: COLUMN blog_authors.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.blog_authors.user_id IS 'Optional link to the OpenThrottle user this byline belongs to (FK users.id, ON DELETE SET NULL). Unique when set (idx_blog_authors_user_id); NULL for guest authors. Never exposed publicly.';


--
-- Name: COLUMN blog_authors.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.blog_authors.created_at IS 'Row creation time.';


--
-- Name: COLUMN blog_authors.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.blog_authors.updated_at IS 'Last modification time; maintained by the update_blog_authors_updated_at trigger.';


--
-- Name: blog_post_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blog_post_tags (
    post_id uuid NOT NULL,
    tag_id uuid NOT NULL
);


--
-- Name: TABLE blog_post_tags; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.blog_post_tags IS 'Many-to-many join between OpenThrottle blog posts and blog tags. Rows are removed with either side (ON DELETE CASCADE).';


--
-- Name: COLUMN blog_post_tags.post_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.blog_post_tags.post_id IS 'Tagged post (FK blog_posts.id, ON DELETE CASCADE).';


--
-- Name: COLUMN blog_post_tags.tag_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.blog_post_tags.tag_id IS 'Applied tag (FK blog_tags.id, ON DELETE CASCADE). Indexed by idx_blog_post_tags_tag_id for tag-page lookups.';


--
-- Name: blog_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blog_posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    excerpt text,
    body_markdown text NOT NULL,
    cover_image_url text,
    cover_image_alt text,
    seo_title text,
    seo_description text,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    published_at timestamp with time zone,
    author_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_edited_by text,
    CONSTRAINT chk_blog_posts_published_at CHECK (((status <> 'PUBLISHED'::text) OR (published_at IS NOT NULL))),
    CONSTRAINT chk_blog_posts_slug CHECK ((slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text)),
    CONSTRAINT chk_blog_posts_status CHECK ((status = ANY (ARRAY['DRAFT'::text, 'PUBLISHED'::text, 'ARCHIVED'::text]))),
    CONSTRAINT chk_blog_posts_title CHECK ((length(btrim(title)) > 0))
);


--
-- Name: TABLE blog_posts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.blog_posts IS 'OpenThrottle blog posts rendered on the public marketing site. Publicly visible iff status = PUBLISHED AND published_at <= now(); that rule lives once, in @openthrottle/nestjs-repositories BlogPostsService.';


--
-- Name: COLUMN blog_posts.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.blog_posts.id IS 'Surrogate key.';


--
-- Name: COLUMN blog_posts.slug; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.blog_posts.slug IS 'Public URL key (/blog/<slug>). Lowercase kebab-case (chk_blog_posts_slug); unique via idx_blog_posts_slug.';


--
-- Name: COLUMN blog_posts.title; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.blog_posts.title IS 'Post headline. Non-empty (chk_blog_posts_title).';


--
-- Name: COLUMN blog_posts.excerpt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.blog_posts.excerpt IS 'Short summary for preview cards; also the meta-description fallback when seo_description is NULL. Optional.';


--
-- Name: COLUMN blog_posts.body_markdown; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.blog_posts.body_markdown IS 'Post body as Markdown, rendered by @openthrottle/react-router-markdown. Reading time is derived from it at read time, never stored.';


--
-- Name: COLUMN blog_posts.cover_image_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.blog_posts.cover_image_url IS 'Absolute URL of the cover image; also used as og:image. Optional.';


--
-- Name: COLUMN blog_posts.cover_image_alt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.blog_posts.cover_image_alt IS 'Alt text for cover_image_url. Optional, but expected whenever cover_image_url is set.';


--
-- Name: COLUMN blog_posts.seo_title; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.blog_posts.seo_title IS 'Overrides title in the document <title>/og:title when set. Optional.';


--
-- Name: COLUMN blog_posts.seo_description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.blog_posts.seo_description IS 'Meta description / og:description; falls back to excerpt when NULL. Optional.';


--
-- Name: COLUMN blog_posts.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.blog_posts.status IS 'Lifecycle: DRAFT (default, never public), PUBLISHED (public once published_at <= now()), ARCHIVED (withdrawn, never public). Enforced by chk_blog_posts_status.';


--
-- Name: COLUMN blog_posts.published_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.blog_posts.published_at IS 'Publication time. Required when status = PUBLISHED (chk_blog_posts_published_at); a future value schedules the post. Orders the public list (newest first).';


--
-- Name: COLUMN blog_posts.author_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.blog_posts.author_id IS 'Byline (FK blog_authors.id, ON DELETE SET NULL). Optional.';


--
-- Name: COLUMN blog_posts.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.blog_posts.created_at IS 'Row creation time.';


--
-- Name: COLUMN blog_posts.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.blog_posts.updated_at IS 'Last modification time; maintained by the update_blog_posts_updated_at trigger. Used as sitemap lastmod.';


--
-- Name: COLUMN blog_posts.last_edited_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.blog_posts.last_edited_by IS 'Caller identity of the most recent write to this post: the user''s display name, or the service account''s name for agent writes (e.g. openthrottle-mcp). NULL for rows written before migration 133.';


--
-- Name: blog_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blog_tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_blog_tags_name CHECK ((length(btrim(name)) > 0)),
    CONSTRAINT chk_blog_tags_slug CHECK ((slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text))
);


--
-- Name: TABLE blog_tags; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.blog_tags IS 'Topics OpenThrottle blog posts are filed under; each has a public tag page (/blog/tags/<slug>).';


--
-- Name: COLUMN blog_tags.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.blog_tags.id IS 'Surrogate key.';


--
-- Name: COLUMN blog_tags.slug; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.blog_tags.slug IS 'Public URL key (/blog/tags/<slug>). Lowercase kebab-case (chk_blog_tags_slug); unique via idx_blog_tags_slug.';


--
-- Name: COLUMN blog_tags.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.blog_tags.name IS 'Display name. Non-empty (chk_blog_tags_name).';


--
-- Name: COLUMN blog_tags.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.blog_tags.description IS 'Short description shown on the tag page. Optional.';


--
-- Name: COLUMN blog_tags.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.blog_tags.created_at IS 'Row creation time.';


--
-- Name: COLUMN blog_tags.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.blog_tags.updated_at IS 'Last modification time; maintained by the update_blog_tags_updated_at trigger.';


--
-- Name: code_embeddings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.code_embeddings (
    id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    workspace_root text NOT NULL,
    path text NOT NULL,
    start_line integer NOT NULL,
    end_line integer NOT NULL,
    content text NOT NULL,
    content_hash text NOT NULL,
    embedding public.vector(1536) NOT NULL
);


--
-- Name: TABLE code_embeddings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.code_embeddings IS 'Source-code chunk embeddings backing the openthrottle-ide engine VectorStore for /ide code semantic search. Keyed by content-derived chunk id; scoped by workspace_root.';


--
-- Name: COLUMN code_embeddings.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.code_embeddings.id IS 'Content-derived chunk id (hashContent(path + content)); idempotent upsert key.';


--
-- Name: COLUMN code_embeddings.workspace_root; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.code_embeddings.workspace_root IS 'Absolute filesystem path of the registered repository; scopes every VectorStore operation.';


--
-- Name: COLUMN code_embeddings.path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.code_embeddings.path IS 'Workspace-relative POSIX path of the source file.';


--
-- Name: COLUMN code_embeddings.start_line; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.code_embeddings.start_line IS '1-based inclusive first line of the chunk.';


--
-- Name: COLUMN code_embeddings.end_line; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.code_embeddings.end_line IS '1-based inclusive last line of the chunk.';


--
-- Name: COLUMN code_embeddings.content; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.code_embeddings.content IS 'Raw source text of the chunk.';


--
-- Name: COLUMN code_embeddings.content_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.code_embeddings.content_hash IS 'sha256 of the chunk content; detects changes.';


--
-- Name: COLUMN code_embeddings.embedding; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.code_embeddings.embedding IS 'pgvector(1536) embedding (OpenAI text-embedding-3-small or 1536-dim Ollama model).';


--
-- Name: code_index_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.code_index_snapshots (
    workspace_root text NOT NULL,
    snapshot jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE code_index_snapshots; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.code_index_snapshots IS 'Per-workspace file-hash snapshot (openthrottle-ide hashWorkspace output) enabling incremental code re-indexing; diffed via diffSnapshots so only added/changed files are re-embedded. Scoped by workspace_root (mirrors code_embeddings).';


--
-- Name: COLUMN code_index_snapshots.workspace_root; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.code_index_snapshots.workspace_root IS 'Absolute filesystem path of the registered repository; one snapshot per workspace (matches code_embeddings.workspace_root).';


--
-- Name: COLUMN code_index_snapshots.snapshot; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.code_index_snapshots.snapshot IS 'JSON array of { path, hash } (workspace-relative POSIX path + sha256 of contents) from the engine hashWorkspace(); diffed against a fresh scan to find added/changed/removed files.';


--
-- Name: COLUMN code_index_snapshots.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.code_index_snapshots.updated_at IS 'Timestamp of the last successful index that persisted this snapshot.';


--
-- Name: custom_prompt_embeddings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.custom_prompt_embeddings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    custom_prompt_id uuid NOT NULL,
    content text NOT NULL,
    embedding public.vector(1536),
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: TABLE custom_prompt_embeddings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.custom_prompt_embeddings IS 'Vector embeddings for custom prompt chunks so semantic search can find agents, skills, commands, and rules.';


--
-- Name: custom_prompts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.custom_prompts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    description text,
    prompt_type text NOT NULL,
    labels jsonb DEFAULT '[]'::jsonb NOT NULL,
    file_path text,
    user_id uuid,
    project_id uuid,
    deleted_at timestamp with time zone,
    CONSTRAINT custom_prompts_prompt_type_check CHECK ((prompt_type = ANY (ARRAY['agents'::text, 'skills'::text, 'commands'::text, 'prompts'::text, 'rules'::text, 'personas'::text])))
);


--
-- Name: TABLE custom_prompts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.custom_prompts IS 'Stores customizable AI workflow documents such as agents, skills, commands, prompts, and coding rules.';


--
-- Name: COLUMN custom_prompts.prompt_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.custom_prompts.prompt_type IS 'Agent-asset kind: agents, skills, commands, prompts, personas. ''rules'' is RETIRED — the .agents/rules + .cursor/rules tree it described was replaced by AGENTS.md § Code style and docs/monorepo/code-style.md; migration 111 soft-deleted those rows and dropped their embeddings. Rows with prompt_type = ''rules'' are expected history, not a bug, and nothing writes the value any more. The CHECK constraint still permits it so the soft-deleted rows remain legal.';


--
-- Name: daily_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_stats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    date date NOT NULL,
    plans_created integer DEFAULT 0 NOT NULL,
    plans_completed integer DEFAULT 0 NOT NULL,
    plans_updated integer DEFAULT 0 NOT NULL,
    tasks_created integer DEFAULT 0 NOT NULL,
    tasks_completed integer DEFAULT 0 NOT NULL,
    tasks_updated integer DEFAULT 0 NOT NULL,
    plans_by_status jsonb DEFAULT '{}'::jsonb NOT NULL,
    tasks_by_status jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE daily_stats; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.daily_stats IS 'One UTC calendar day of aggregated OpenThrottle activity counts and status rollups for dashboards and reporting.';


--
-- Name: documentation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documentation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    path text NOT NULL,
    content text NOT NULL,
    repo text NOT NULL,
    sha text NOT NULL,
    pr_number integer,
    authors jsonb DEFAULT '[]'::jsonb NOT NULL,
    message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE documentation; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.documentation IS 'Indexed documentation file snapshots from ingested repositories for search and downstream embedding.';


--
-- Name: documentation_embeddings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documentation_embeddings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    embedding public.vector(1536),
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    documentation_id uuid NOT NULL
);


--
-- Name: TABLE documentation_embeddings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.documentation_embeddings IS 'Vector embeddings for documentation chunks enabling semantic search over the docs knowledge base.';


--
-- Name: mcp_connector_connections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mcp_connector_connections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    connector_key text NOT NULL,
    user_id uuid NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    auth_type text NOT NULL,
    credential_prefix text,
    credential_secret_hash text,
    credential_label text,
    connected_at timestamp with time zone DEFAULT now() NOT NULL,
    last_used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mcp_connector_connections_auth_type_check CHECK ((auth_type = ANY (ARRAY['api_token'::text, 'oauth'::text])))
);


--
-- Name: TABLE mcp_connector_connections; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.mcp_connector_connections IS 'Per-user connection state for the curated MCP connectors catalog; the catalog metadata is a server-side code seed, this table is only the user''s connect/enable state + a masked credential hint (no raw secrets).';


--
-- Name: COLUMN mcp_connector_connections.connector_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mcp_connector_connections.connector_key IS 'Stable key into the server-side connector catalog seed (e.g. ''github''); no FK because the catalog is code, not a table.';


--
-- Name: COLUMN mcp_connector_connections.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mcp_connector_connections.user_id IS 'Owner of the connection. Baseline is user-scoped; a future workspace scope would add a nullable workspace column alongside this.';


--
-- Name: COLUMN mcp_connector_connections.enabled; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mcp_connector_connections.enabled IS 'Whether the connection is active for the user; enable/disable flips this boolean and retains the credential hint.';


--
-- Name: COLUMN mcp_connector_connections.auth_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mcp_connector_connections.auth_type IS 'Auth mechanism at connect time, denormalized from the catalog seed: api_token or oauth.';


--
-- Name: COLUMN mcp_connector_connections.credential_prefix; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mcp_connector_connections.credential_prefix IS 'Masked display hint for an api_token credential (e.g. ''sk_live_…abcd''); NULL for oauth connections. Never the raw secret.';


--
-- Name: COLUMN mcp_connector_connections.credential_secret_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mcp_connector_connections.credential_secret_hash IS 'bcrypt hash of the supplied api_token, mirroring service_account_credentials.secret_hash; NULL for oauth. Retained for parity/duplicate-detection only — not recoverable, and not replayable to the external server (that is deferred to the agent-run-wiring follow-up).';


--
-- Name: COLUMN mcp_connector_connections.credential_label; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mcp_connector_connections.credential_label IS 'Optional user-supplied label for the connection''s credential.';


--
-- Name: COLUMN mcp_connector_connections.last_used_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mcp_connector_connections.last_used_at IS 'Reserved: set when an enabled connection is used by an agent run (agent-run wiring is a follow-up plan).';


--
-- Name: notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    content text NOT NULL,
    author text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.notes IS 'Quick unstructured notes from the OpenThrottle MCP for capture separate from structured plans and tasks.';


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    description text,
    name text NOT NULL
);


--
-- Name: TABLE permissions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.permissions IS 'Named RBAC permission definitions joined to roles for OpenThrottle admin access control.';


--
-- Name: plan_embeddings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_embeddings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    embedding public.vector(1536),
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    plan_id uuid NOT NULL
);


--
-- Name: TABLE plan_embeddings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.plan_embeddings IS 'Vector embeddings for plan content chunks used for semantic search over plans.';


--
-- Name: plan_output_stream; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_output_stream (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    iteration integer,
    plan_id uuid NOT NULL,
    task_id uuid
);


--
-- Name: TABLE plan_output_stream; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.plan_output_stream IS 'Ordered append-only log chunks per plan for agent or Ralph iteration output stored in the database.';


--
-- Name: COLUMN plan_output_stream.task_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.plan_output_stream.task_id IS 'Task this output chunk was attributed to; NULL for plan-scoped chunks (server-written metrics, lifecycle/job-run hooks) and all historical rows. Best-effort attribution set by the agent tagging its append_plan_output call with the task it is actively working. ON DELETE SET NULL preserves output history when a task is removed.';


--
-- Name: plan_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id uuid NOT NULL,
    queue_name text DEFAULT 'plans'::text NOT NULL,
    bullmq_job_id text,
    run_kind text DEFAULT 'spawn'::text NOT NULL,
    execution_backend text DEFAULT 'cursor'::text NOT NULL,
    status text DEFAULT 'QUEUED'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    run_config_snapshot jsonb,
    actor_user_id uuid,
    cancel_requested_at timestamp with time zone,
    cancel_requested_by uuid,
    hostname text,
    pid integer,
    worker_id text,
    last_heartbeat_at timestamp with time zone,
    branch text,
    model text,
    checkout_id uuid,
    heartbeat_expected boolean DEFAULT true NOT NULL,
    usage_limit_resets_at timestamp with time zone,
    usage_limit_type text,
    resume_of_run_id uuid,
    scheduled_for timestamp with time zone,
    CONSTRAINT plan_runs_execution_backend_check CHECK ((execution_backend = ANY (ARRAY['antigravity'::text, 'claude'::text, 'codex'::text, 'cursor'::text, 'gemini'::text, 'grok'::text, 'opencode'::text]))),
    CONSTRAINT plan_runs_run_kind_check CHECK ((run_kind = ANY (ARRAY['spawn'::text, 'orchestrator'::text])))
);


--
-- Name: TABLE plan_runs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.plan_runs IS 'Audit table for queued Ralph plan runs. Each row stores the single execution backend selected for that run.';


--
-- Name: COLUMN plan_runs.bullmq_job_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.plan_runs.bullmq_job_id IS 'BullMQ job id for this run; NULL for detached-CLI runs that carry no queue job. Unique per queue_name via the partial index plan_runs_queue_job_unique_idx (only where NOT NULL).';


--
-- Name: COLUMN plan_runs.execution_backend; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.plan_runs.execution_backend IS 'Agent-CLI backend that executed this run. One of the openthrottle-drivers DRIVER_IDS (antigravity, claude, codex, cursor, gemini, grok, opencode); enforced by plan_runs_execution_backend_check. Defaults to cursor.';


--
-- Name: COLUMN plan_runs.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.plan_runs.status IS 'Run lifecycle (plain TEXT, no CHECK): SCHEDULED (a run scheduled for scheduled_for; a delayed job is waiting and the run holds no worktree until it fires), QUEUED (job enqueued, possibly delayed), IN_PROGRESS (executing), COMPLETED, FAILED, CANCELLED, STALE (contact lost; set only by the stale sweeper or a human escape hatch), USAGE_LIMITED (the run stopped cleanly because the agent account hit a subscription usage limit; terminal for this row, a continuation run may have been enqueued -- see resume_of_run_id), MISSED (a scheduled run that could not fire within the 1-hour grace window; terminal), SUPERSEDED (a scheduled run held at fire time because the plan already had an active run; terminal, never double-runs a plan).';


--
-- Name: COLUMN plan_runs.run_config_snapshot; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.plan_runs.run_config_snapshot IS 'Resolved PlanRunConfigSnapshot v1 at enqueue: target, workspace, Ralph tuning, optional embedded jobRunHooks. Null for runs queued before this column existed. See plan-run-config-snapshot in @openthrottle/nestjs-repositories.';


--
-- Name: COLUMN plan_runs.actor_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.plan_runs.actor_user_id IS 'User who enqueued this run (auth sub when the principal is a user). Null for service-account/system runs and for rows queued before this column existed. Keys user-scoped notifications.';


--
-- Name: COLUMN plan_runs.cancel_requested_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.plan_runs.cancel_requested_at IS 'Durable cancel-request marker (Channel 1): when cancelRun stamped a stop request for this run. The run loop polls this at each iteration boundary and aborts if set, guaranteeing cross-process/host/CLI cancellation even if the Redis pub/sub fast-path message was missed. NULL when no cancel was requested.';


--
-- Name: COLUMN plan_runs.cancel_requested_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.plan_runs.cancel_requested_by IS 'User (auth sub) who requested cancellation; NULL for service-account/system cancels or when no cancel was requested. Auditable companion to cancel_requested_at.';


--
-- Name: COLUMN plan_runs.hostname; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.plan_runs.hostname IS 'Host the worker executing this run is on (os.hostname()); populated at job start, cleared in the worker finally. Observability + same-host escalation groundwork only — cross-host OS kill is out of scope. NULL when the run is not actively executing.';


--
-- Name: COLUMN plan_runs.pid; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.plan_runs.pid IS 'OS process id of the worker executing this run; populated at job start, cleared in the worker finally. Diagnostic + future same-host pid-targeted escalation. NULL when not actively executing.';


--
-- Name: COLUMN plan_runs.worker_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.plan_runs.worker_id IS 'Identifier of the worker instance executing this run (BullMQ worker id); populated at job start, cleared in the worker finally. NULL when not actively executing.';


--
-- Name: COLUMN plan_runs.last_heartbeat_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.plan_runs.last_heartbeat_at IS 'Liveness bump written by the owning run process (detached CLI loop or in-server worker) roughly every 15s while the run executes, and stamped at run start. An IN_PROGRESS row whose heartbeat is older than the staleness cutoff (~120s) is treated as dead: the run-display reader marks it stale (hiding Kill) and the staleness sweeper settles it to STALE and reconciles the plan. Dedicated column (not updated_at, which is auto-bumped by unrelated writes -> false liveness). NULL for legacy rows / rows that never started heartbeating.';


--
-- Name: COLUMN plan_runs.branch; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.plan_runs.branch IS 'Git branch this run operates on, captured at kickoff as a REQUIRED enqueue input (not inferred server-side). The clearest provenance gap this plan closes: previously only repositories.default_branch (repo-level) existed. Powers branch->PR mapping. NULLable for legacy/backfilled rows; enforcement is at the enqueue input boundary, not a DB constraint.';


--
-- Name: COLUMN plan_runs.model; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.plan_runs.model IS 'Resolved agent model id for this run (e.g. claude-fable-5), captured at kickoff. Queryable projection of run_config_snapshot.ralph.model (the raw record stays the source). NULL for legacy rows lacking snapshot data.';


--
-- Name: COLUMN plan_runs.checkout_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.plan_runs.checkout_id IS 'repository_checkouts row (kind=worktree for provisioned runs) giving this run its durable on-disk home; filesystem_path there powers "open in editor" deep-links. Captured at kickoff from run_config_snapshot.workspace.checkoutId. ON DELETE SET NULL so checkout teardown keeps the run row. NULL for legacy rows or runs without a resolved checkout.';


--
-- Name: COLUMN plan_runs.heartbeat_expected; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.plan_runs.heartbeat_expected IS 'Whether this run''s owner bumps last_heartbeat_at on a timer. TRUE (the default, and every queued or detached-CLI run) means heartbeat-based liveness applies: the 120s stale sweep (findStaleInProgressRuns) may settle the run AND reconcile its plan. FALSE marks a run whose owner has no timer -- an interactive /ot-loop agent turn -- and therefore cannot be judged live or dead by heartbeat: such rows are excluded from that 120s sweep, always report isStale = false, and count as live-by-status for heartbeat-based worktree liveness (findLiveRunsByCheckoutIds). A statement about the owner, never a liveness claim; an unsupervised run''s liveness is unknown, so read this flag alongside isStale. Such rows are NOT unswept: a separate pass settles them to STALE on sheer age (findStaleUnsupervisedRuns, UNSUPERVISED_STALE_CUTOFF_MS = 12h), and registerCliRun settles superseded unsupervised runs on the same plan. Both settle the RUN ROW ONLY and never touch plan or task status -- nothing may reset a plan to PENDING on the strength of a missing heartbeat, which is the hazard this column exists to avoid. The owning skill settling its own row terminally remains primary; these are backstops that can only ever report STALE.';


--
-- Name: COLUMN plan_runs.usage_limit_resets_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.plan_runs.usage_limit_resets_at IS 'When the usage limit that stopped this run lifts, as reported by the agent CLI. NULL when the run was not usage-limited or the CLI did not report a reset time.';


--
-- Name: COLUMN plan_runs.usage_limit_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.plan_runs.usage_limit_type IS 'Raw name of the usage-limit window that stopped this run (five_hour, seven_day, ...), kept as TEXT because the agent CLI adds windows over time. NULL when the run was not usage-limited or the window was not reported.';


--
-- Name: COLUMN plan_runs.resume_of_run_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.plan_runs.resume_of_run_id IS 'The usage-limited run this run continues, set on the continuation run the plans worker enqueues after a usage limit. NULL for every ordinary run. The partial UNIQUE index on this column allows at most one continuation per limited run (the idempotency anchor), and walking it backwards bounds how many times a plan is auto-resumed.';


--
-- Name: COLUMN plan_runs.scheduled_for; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.plan_runs.scheduled_for IS 'The absolute UTC instant a SCHEDULED run fires at. Set only on runs created by schedulePlanRun and kept after the row settles, so run history still shows when it was meant to fire. NULL for every run that was enqueued to run now.';


--
-- Name: plan_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id uuid NOT NULL,
    tag text NOT NULL,
    dimension text NOT NULL,
    source text NOT NULL,
    confidence numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_plan_tags_dimension CHECK ((dimension = ANY (ARRAY['domain'::text, 'phase'::text]))),
    CONSTRAINT chk_plan_tags_source CHECK ((source = ANY (ARRAY['human'::text, 'agent'::text, 'server-llm'::text]))),
    CONSTRAINT chk_plan_tags_tag_kebab CHECK ((tag ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text))
);


--
-- Name: TABLE plan_tags; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.plan_tags IS 'Tags attached to plans (one row per plan+tag). tag is service-layer validated against the caller''s user_skill_tags vocabulary (no FK, mirroring project_skills.tags); source records the writing identity for the provenance ladder (human > agent > server-llm). Feeds the effective-tag-set rollup and tag_action_rules matching. See docs/monorepo/plan-task-tags-rules-design.md.';


--
-- Name: COLUMN plan_tags.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.plan_tags.id IS 'Surrogate primary key.';


--
-- Name: COLUMN plan_tags.plan_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.plan_tags.plan_id IS 'Tagged plan (plans.id); cascade-deleted with the plan.';


--
-- Name: COLUMN plan_tags.tag; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.plan_tags.tag IS 'Kebab-case tag slug (matches AGENT_ASSET_SLUG_PATTERN in @openthrottle/openthrottle-skills). Unique per plan; validated against the caller''s vocabulary at write time.';


--
-- Name: COLUMN plan_tags.dimension; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.plan_tags.dimension IS 'Vocabulary axis, denormalized from user_skill_tags at write time: domain (subject area) or phase (lifecycle stage; at most one phase tag per plan, service-enforced).';


--
-- Name: COLUMN plan_tags.source; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.plan_tags.source IS 'Writing identity class, derived server-side (never caller-supplied): human (developer-app session), agent (agent token), or server-llm (tagging service account). Ranked human > agent > server-llm for replace/remove arbitration.';


--
-- Name: COLUMN plan_tags.confidence; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.plan_tags.confidence IS 'Model confidence for server-llm rows (0-1); NULL for human/agent rows. Stored for observability; non-gating in v1.';


--
-- Name: COLUMN plan_tags.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.plan_tags.created_at IS 'Row creation timestamp.';


--
-- Name: COLUMN plan_tags.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.plan_tags.updated_at IS 'Last-update timestamp, maintained by the update_updated_at_column() trigger.';


--
-- Name: plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    author text NOT NULL,
    category text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    description text,
    title text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    assignee text,
    summary text,
    project text,
    project_id uuid,
    status public.plan_task_status DEFAULT 'PENDING'::public.plan_task_status CONSTRAINT plans_status_new_not_null NOT NULL,
    job_run_hooks jsonb DEFAULT '{"hooks": []}'::jsonb NOT NULL,
    run_config jsonb DEFAULT '{"version": 1}'::jsonb NOT NULL,
    completed_at timestamp with time zone
);


--
-- Name: TABLE plans; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.plans IS 'OpenThrottle plan records with title, status, category, and author for the plans and tasks knowledge base.';


--
-- Name: COLUMN plans.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.plans.status IS 'Definitive enum: BACKLOG, BLOCKED, CANCELED, COMPLETED, IN_PROGRESS, PENDING, PROMOTED, QUEUED, SKIPPED (QUEUED: plans only, when job enqueued in BullMQ; PROMOTED: work continued as its own plan).';


--
-- Name: COLUMN plans.job_run_hooks; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.plans.job_run_hooks IS 'Ordered before_run / after_run hooks ({ hooks: [...] }). See JOB_RUN_LIFECYCLE_HOOKS.md and @tools/workflows job-run-lifecycle-hooks types.';


--
-- Name: COLUMN plans.run_config; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.plans.run_config IS 'Versioned workflow-ralph defaults for this plan (PlanRunConfigStorage v1 in @openthrottle/nestjs-repositories). Fields: version, target (mode, taskId), workspace (workingDirectory), ralph (executionBackend, iterations, prompt, worktree, etc.). planId is implicit (plans.id). Validated on GraphQL write; see plan-run-config-storage.validation.ts.';


--
-- Name: COLUMN plans.completed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.plans.completed_at IS 'Set once when status transitions into COMPLETED (app write path only); cleared if status leaves COMPLETED. Immutable to later edits and to BEFORE UPDATE updated_at triggers. Used by daily_stats for day-range completion counts.';


--
-- Name: project_skills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_skills (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    slug text NOT NULL,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    disable_model_invocation boolean,
    source_path text NOT NULL,
    ingested_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    source text DEFAULT 'external'::text NOT NULL,
    source_url text,
    description text,
    orphaned_at timestamp with time zone,
    CONSTRAINT chk_project_skills_slug_kebab CHECK ((slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text)),
    CONSTRAINT chk_project_skills_source CHECK ((source = ANY (ARRAY['external'::text, 'openthrottle'::text])))
);


--
-- Name: TABLE project_skills; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.project_skills IS 'Per-project skill registry: skills most recently ingested for a project''s linked repository, with static frontmatter tags and the tri-state disable-model-invocation flag, queryable server-side without disk access. Written by the agent-asset ingest path; read by ProjectSkillsService.getSkillsForProject. See docs/monorepo/skill-availability-design.md.';


--
-- Name: COLUMN project_skills.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_skills.id IS 'Surrogate primary key.';


--
-- Name: COLUMN project_skills.project_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_skills.project_id IS 'Owning project (projects.id); cascade-deleted with the project. The skill universe is scoped per project.';


--
-- Name: COLUMN project_skills.slug; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_skills.slug IS 'Kebab-case skill slug (the .agents/skills/<slug> directory name; matches AGENT_ASSET_SLUG_PATTERN). Unique per project.';


--
-- Name: COLUMN project_skills.tags; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_skills.tags IS 'Static frontmatter tags for the skill; empty array when the skill declares none. Referenced by skill-availability rules.';


--
-- Name: COLUMN project_skills.disable_model_invocation; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_skills.disable_model_invocation IS 'Static frontmatter disable-model-invocation flag, tri-state: TRUE suppresses model-initiated invocation, FALSE forces it invocable, NULL means the key is unset (invocable by default). NULL is deliberately distinct from FALSE.';


--
-- Name: COLUMN project_skills.source_path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_skills.source_path IS 'Repo-relative SKILL.md path the skill was ingested from (e.g. .agents/skills/<slug>/SKILL.md).';


--
-- Name: COLUMN project_skills.ingested_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_skills.ingested_at IS 'Timestamp of the most recent ingest that upserted this row.';


--
-- Name: COLUMN project_skills.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_skills.created_at IS 'Row creation timestamp.';


--
-- Name: COLUMN project_skills.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_skills.updated_at IS 'Last-update timestamp, maintained by the update_updated_at_column() trigger.';


--
-- Name: COLUMN project_skills.source; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_skills.source IS 'Skill provenance from SKILL.md frontmatter: ''openthrottle'' for skills OpenThrottle authors and manages, ''external'' for skills installed from an outside source. Omitted or unrecognized frontmatter values normalize to ''external'' at parse time (conservative: only explicitly claimed skills read as ours), which the column default mirrors.';


--
-- Name: COLUMN project_skills.source_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_skills.source_url IS 'Optional origin URL for external skills (marketplace listing or upstream repo) from the SKILL.md frontmatter `sourceUrl` key; NULL when the frontmatter omits it. Not meaningful for source = ''openthrottle''.';


--
-- Name: COLUMN project_skills.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_skills.description IS 'Skill description from SKILL.md frontmatter (the same text ingested into custom_prompts.description); NULL when the frontmatter omits it. Surfaced read-only through the projectSkills GraphQL query so the developer app''s /skills slash-command menu can show descriptions in deployed environments that have no local checkout for filesystem discovery.';


--
-- Name: COLUMN project_skills.orphaned_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_skills.orphaned_at IS 'Set when agent-asset ingest no longer finds this slug on disk; NULL while the skill is present. OpenThrottle does not auto-delete the row — tags stay on the record until an explicit remove.';


--
-- Name: project_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    tag text NOT NULL,
    dimension text NOT NULL,
    source text NOT NULL,
    confidence numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_project_tags_dimension CHECK ((dimension = ANY (ARRAY['domain'::text, 'phase'::text]))),
    CONSTRAINT chk_project_tags_source CHECK ((source = ANY (ARRAY['human'::text, 'agent'::text, 'server-llm'::text]))),
    CONSTRAINT chk_project_tags_tag_kebab CHECK ((tag ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text))
);


--
-- Name: TABLE project_tags; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.project_tags IS 'Tags attached to projects (one row per project+tag). Same shape and semantics as plan_tags/task_tags: service-layer vocabulary validation (no FK), identity-derived source for the provenance ladder. Multiple tags per project allowed (no ≤1-phase constraint). A project''s tags feed the effective-tag-set rollup for its plans and tag_action_rules matching. See docs/monorepo/plan-task-tags-rules-design.md.';


--
-- Name: COLUMN project_tags.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_tags.id IS 'Surrogate primary key.';


--
-- Name: COLUMN project_tags.project_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_tags.project_id IS 'Tagged project (projects.id); cascade-deleted with the project.';


--
-- Name: COLUMN project_tags.tag; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_tags.tag IS 'Kebab-case tag slug (matches AGENT_ASSET_SLUG_PATTERN in @openthrottle/openthrottle-skills). Unique per project; validated against the caller''s vocabulary at write time.';


--
-- Name: COLUMN project_tags.dimension; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_tags.dimension IS 'Vocabulary axis, denormalized from user_skill_tags at write time: domain (subject area) or phase (lifecycle stage).';


--
-- Name: COLUMN project_tags.source; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_tags.source IS 'Writing identity class, derived server-side (never caller-supplied): human (developer-app session), agent (agent token), or server-llm (tagging service account). Ranked human > agent > server-llm for replace/remove arbitration.';


--
-- Name: COLUMN project_tags.confidence; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_tags.confidence IS 'Model confidence for server-llm rows (0-1); NULL for human/agent rows. Stored for observability; non-gating in v1.';


--
-- Name: COLUMN project_tags.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_tags.created_at IS 'Row creation timestamp.';


--
-- Name: COLUMN project_tags.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_tags.updated_at IS 'Last-update timestamp, maintained by the update_updated_at_column() trigger.';


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    description text,
    name text NOT NULL,
    nx_project_name text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE projects; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.projects IS 'Logical or Nx project groupings that scope plans and tasks within the workspace.';


--
-- Name: repositories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.repositories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    normalized_remote_url text,
    name text NOT NULL,
    default_branch text,
    project_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    ledger_harvest_enabled boolean DEFAULT true NOT NULL,
    ledger_harvest_cursor text,
    ledger_harvested_at timestamp with time zone
);


--
-- Name: TABLE repositories; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.repositories IS 'OpenThrottle repository identity, keyed by normalized git remote URL; provisional (NULL remote) rows exist for local-only folders until a remote is detected.';


--
-- Name: COLUMN repositories.normalized_remote_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.repositories.normalized_remote_url IS 'Canonical https form (host lowercased, ssh converted, .git and trailing slash stripped); NULL for provisional local-only repositories.';


--
-- Name: COLUMN repositories.project_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.repositories.project_id IS 'OpenThrottle project link, owned at the repository level (not per-checkout) so all users sharing a remote share one project link.';


--
-- Name: COLUMN repositories.ledger_harvest_enabled; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.repositories.ledger_harvest_enabled IS 'Whether the work-ledger trailer harvest sweeps this repo. Defaults TRUE (opt-out): a default-false flag would make the harvester silently do nothing on a fresh install. Set FALSE to exclude a repo deliberately. Eligibility also requires a parseable github.com/<owner>/<repo> URL and a non-empty default_branch, both derived rather than stored.';


--
-- Name: COLUMN repositories.ledger_harvest_cursor; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.repositories.ledger_harvest_cursor IS 'Last commit sha harvested from this repo default branch. The next sweep pages until it sees this sha and stops, so only newly-landed commits are examined. NULL means scan from the beginning (never harvested), NOT skip.';


--
-- Name: COLUMN repositories.ledger_harvested_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.repositories.ledger_harvested_at IS 'When the last work-ledger harvest sweep completed for this repo. Operator legibility only — the sweep keys off ledger_harvest_cursor, never off this timestamp.';


--
-- Name: repository_checkouts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.repository_checkouts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    repository_id uuid NOT NULL,
    user_id uuid NOT NULL,
    filesystem_path text NOT NULL,
    display_name text NOT NULL,
    managed boolean DEFAULT false NOT NULL,
    kind text DEFAULT 'primary'::text NOT NULL,
    inspection jsonb,
    scanned_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    foreign_skill_injection_enabled boolean DEFAULT false NOT NULL,
    CONSTRAINT repository_checkouts_kind_check CHECK ((kind = ANY (ARRAY['primary'::text, 'worktree'::text])))
);


--
-- Name: TABLE repository_checkouts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.repository_checkouts IS 'Per-user on-disk instances of an OpenThrottle repository; the DB row is a cache over the manifest and git state actually on disk.';


--
-- Name: COLUMN repository_checkouts.managed; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.repository_checkouts.managed IS 'True when OpenThrottle cloned this checkout (into OPENTHROTTLE_CHECKOUT_ROOT); false for user-registered existing folders.';


--
-- Name: COLUMN repository_checkouts.kind; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.repository_checkouts.kind IS 'primary = the user''s main checkout; worktree = reserved for future workflow worktree-pool unification.';


--
-- Name: COLUMN repository_checkouts.inspection; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.repository_checkouts.inspection IS 'Cached RepositoryInspectionService snapshot (git/stack/agent-config detection); disk is the source of truth, this is a refreshable cache keyed by scanned_at.';


--
-- Name: COLUMN repository_checkouts.foreign_skill_injection_enabled; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.repository_checkouts.foreign_skill_injection_enabled IS 'True when this user opts this checkout into foreign-workspace skill injection (OpenThrottle curated skills projected into .agents/skills + .claude/skills on foreign runs). Default FALSE (opt-in); gate reads it per (actor_user_id, filesystem_path) before materializing.';


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    permission_id uuid NOT NULL,
    role_id uuid NOT NULL
);


--
-- Name: TABLE role_permissions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.role_permissions IS 'Join of roles to permissions defining which capabilities each RBAC role grants.';


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    description text,
    name text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE roles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.roles IS 'Named RBAC roles for OpenThrottle admin access aligned with application permission sets.';


--
-- Name: rollout_flags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rollout_flags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    description text,
    enabled boolean DEFAULT false NOT NULL,
    target_roles text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    kind text DEFAULT 'boolean'::text NOT NULL,
    variations jsonb DEFAULT '[{"value": false}, {"value": true}]'::jsonb NOT NULL,
    off_variation integer DEFAULT 0 NOT NULL,
    fallthrough jsonb DEFAULT '{"variations": [{"weight": 100, "variation": 1}]}'::jsonb NOT NULL,
    CONSTRAINT chk_rollout_flags_fallthrough_object CHECK ((jsonb_typeof(fallthrough) = 'object'::text)),
    CONSTRAINT chk_rollout_flags_key CHECK ((length(btrim(key)) > 0)),
    CONSTRAINT chk_rollout_flags_kind CHECK ((kind = ANY (ARRAY['boolean'::text, 'string'::text, 'number'::text, 'json'::text]))),
    CONSTRAINT chk_rollout_flags_off_variation CHECK ((off_variation >= 0)),
    CONSTRAINT chk_rollout_flags_variations_array CHECK (((jsonb_typeof(variations) = 'array'::text) AND (jsonb_array_length(variations) >= 1)))
);


--
-- Name: TABLE rollout_flags; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.rollout_flags IS 'Feature flags for the OpenThrottle Rollout system. Each row is a typed flag (boolean | string | number | json) with ordered variations, an off/default variation index, a percentage fallthrough allocation, and optional RBAC role targeting. Evaluated server-side by @openthrottle/nestjs-rollout. Variations and fallthrough are jsonb on the flag row (single-row config; no child tables in v1). Percentage bucketing is non-sticky (principal id mod 100); sticky assignment, environments, segments, and rules are deferred.';


--
-- Name: COLUMN rollout_flags.key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rollout_flags.key IS 'Unique flag key (kebab/dotted string, e.g. new-dashboard or billing.invoices). Non-empty (chk_rollout_flags_key); uniqueness enforced by idx_rollout_flags_key.';


--
-- Name: COLUMN rollout_flags.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rollout_flags.description IS 'Human-readable description of what the flag gates. Optional.';


--
-- Name: COLUMN rollout_flags.enabled; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rollout_flags.enabled IS 'Master switch. When FALSE, evaluation returns the off_variation value for everyone regardless of target_roles or fallthrough.';


--
-- Name: COLUMN rollout_flags.target_roles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rollout_flags.target_roles IS 'RBAC role names the flag targets. Empty array => eligible for everyone (then fallthrough applies); otherwise the actor must hold at least one listed role before fallthrough; on miss, off_variation is returned.';


--
-- Name: COLUMN rollout_flags.kind; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rollout_flags.kind IS 'Flag value kind: boolean | string | number | json (chk_rollout_flags_kind). Controls how variation.value is interpreted. Default boolean for backfilled v1 flags.';


--
-- Name: COLUMN rollout_flags.variations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rollout_flags.variations IS 'Ordered jsonb array of { name?, description?, value } where value matches kind. LD-like boolean default: [{value:false},{value:true}]. Shape validated in app; DB only checks non-empty array.';


--
-- Name: COLUMN rollout_flags.off_variation; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rollout_flags.off_variation IS 'Zero-based index into variations returned when the flag is disabled or the actor fails the target_roles gate. Must be >= 0 (chk_rollout_flags_off_variation); in-range vs variations length enforced in app.';


--
-- Name: COLUMN rollout_flags.fallthrough; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rollout_flags.fallthrough IS 'Percentage allocation among variations when the flag is enabled and the actor passes targeting. Shape: { variations: [{ variation: <index>, weight: <0-100 int> }, ...] }. Weights are integer percents that must sum to 100 (enforced in app). Default: 100% on variation 1 (true) for backfilled boolean flags.';


--
-- Name: rule_applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rule_applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rule_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    task_id uuid,
    state text NOT NULL,
    details jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_rule_applications_state CHECK ((state = ANY (ARRAY['applied'::text, 'pre-satisfied'::text, 'flagged'::text, 'orphaned'::text])))
);


--
-- Name: TABLE rule_applications; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.rule_applications IS 'Apply-once ledger for tag_action_rules executions against plans. UNIQUE (rule_id, plan_id) is the idempotency fingerprint (any-state row ⇒ executor no-op), making at-least-once redelivery and races safe. States: applied | pre-satisfied | flagged | orphaned; actions are never undone. See docs/monorepo/plan-task-tags-rules-design.md.';


--
-- Name: COLUMN rule_applications.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rule_applications.id IS 'Surrogate primary key.';


--
-- Name: COLUMN rule_applications.rule_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rule_applications.rule_id IS 'The rule that was evaluated (tag_action_rules.id); cascade-deleted with the rule, taking its ledger history with it.';


--
-- Name: COLUMN rule_applications.plan_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rule_applications.plan_id IS 'The plan the rule was evaluated against (plans.id); cascade-deleted with the plan.';


--
-- Name: COLUMN rule_applications.task_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rule_applications.task_id IS 'For inject-task applications, the injected (or pre-satisfying) task (tasks.id). SET NULL when a human deletes that task — the applied row survives so the rule is never re-applied.';


--
-- Name: COLUMN rule_applications.state; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rule_applications.state IS 'Outcome: applied (action performed), pre-satisfied (already satisfied on first evaluation), flagged (blocked by executor gating; see details), orphaned (rule un-matched after applied; action left in place).';


--
-- Name: COLUMN rule_applications.details; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rule_applications.details IS 'Executor-specific context for the state (e.g. {reason: ''skill-unavailable''} on flagged rows, matched tags at apply time). Rendered in the developer-app applications queue.';


--
-- Name: COLUMN rule_applications.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rule_applications.created_at IS 'Row creation timestamp (first evaluation that produced a ledger row).';


--
-- Name: COLUMN rule_applications.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rule_applications.updated_at IS 'Last-update timestamp (e.g. applied → orphaned flip), maintained by the update_updated_at_column() trigger.';


--
-- Name: scheduled_agent_job_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scheduled_agent_job_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    scheduled_agent_job_id uuid NOT NULL,
    bullmq_job_id text,
    status text DEFAULT 'queued'::text NOT NULL,
    driver_id text NOT NULL,
    model text,
    trigger text DEFAULT 'schedule'::text NOT NULL,
    exit_code integer,
    error_message text,
    cancel_requested_at timestamp with time zone,
    started_at timestamp with time zone,
    finished_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    settings_snapshot jsonb,
    input_tokens bigint,
    output_tokens bigint,
    cache_read_tokens bigint,
    cache_write_tokens bigint,
    reasoning_tokens bigint,
    total_tokens bigint,
    cost_usd numeric(12,6),
    raw_usage jsonb,
    repository_checkout_id uuid,
    resolved_cwd text,
    usage_limit_resets_at timestamp with time zone,
    usage_limit_type text,
    resume_of_run_id uuid,
    scheduled_for timestamp with time zone,
    CONSTRAINT chk_scheduled_agent_job_runs_status CHECK ((status = ANY (ARRAY['queued'::text, 'running'::text, 'succeeded'::text, 'failed'::text, 'cancelled'::text, 'no_op'::text, 'usage_limited'::text, 'missed'::text]))),
    CONSTRAINT chk_scheduled_agent_job_runs_trigger CHECK ((trigger = ANY (ARRAY['schedule'::text, 'manual'::text, 'resume'::text])))
);


--
-- Name: TABLE scheduled_agent_job_runs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.scheduled_agent_job_runs IS 'Append-only run history (status/timing/exit) for scheduled_agent_jobs. Run *logs* are not here — they stream to the JSONL sink (queueJobLogs/queueJobLogTail), joined by bullmq_job_id.';


--
-- Name: COLUMN scheduled_agent_job_runs.bullmq_job_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scheduled_agent_job_runs.bullmq_job_id IS 'BullMQ job id; the join key to queueJobLogs (queueName, jobId). Equals the run id for run-now (jobId = runId); set inside the processor for scheduled fires.';


--
-- Name: COLUMN scheduled_agent_job_runs.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scheduled_agent_job_runs.status IS 'queued (pre-created by run-now, or a delayed usage-limit resume) -> running (claimed by processor) -> succeeded | no_op | failed | cancelled | usage_limited. Mapped from runAgentPrompt RunAgentStatus, except no_op which comes from the agent-emitted OT_RUN_OUTCOME sentinel (process exited 0 but the agent reported it did not do the work; terminal, NOT an error), and usage_limited, which is set when the agent CLI reported a Claude subscription usage limit (terminal for this row, NOT an error; a continuation run may have been enqueued -- see resume_of_run_id). missed is created terminal: a cron fire the misfire policy did not run (see scheduled_for and scheduled_agent_jobs.misfire_policy); no agent was spawned.';


--
-- Name: COLUMN scheduled_agent_job_runs.trigger; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scheduled_agent_job_runs.trigger IS 'schedule = cron fire; manual = run-now; resume = the delayed continuation of a usage_limited run (see resume_of_run_id).';


--
-- Name: COLUMN scheduled_agent_job_runs.exit_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scheduled_agent_job_runs.exit_code IS 'Child process exit code from runAgentPrompt; null on timeout/cancel/spawn error.';


--
-- Name: COLUMN scheduled_agent_job_runs.cancel_requested_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scheduled_agent_job_runs.cancel_requested_at IS 'Durable cancel marker set by cancelScheduledAgentJobRun; the processor aborts the run when set (paired with a cross-process cancel channel).';


--
-- Name: COLUMN scheduled_agent_job_runs.settings_snapshot; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scheduled_agent_job_runs.settings_snapshot IS 'Effective run settings at execution time (driver, model, reasoning tier, permission mode, run-config), captured from the job payload when the run is created so later schedule edits do not rewrite this run''s history. Null for legacy rows / runs created before snapshotting.';


--
-- Name: COLUMN scheduled_agent_job_runs.input_tokens; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scheduled_agent_job_runs.input_tokens IS 'Prompt/input tokens for the run; parsed from the buffered CLI output via the shared normalizer. Null when the backend did not report it.';


--
-- Name: COLUMN scheduled_agent_job_runs.output_tokens; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scheduled_agent_job_runs.output_tokens IS 'Completion/output tokens for the run; parsed from the buffered CLI output. Null when the backend did not report it.';


--
-- Name: COLUMN scheduled_agent_job_runs.cache_read_tokens; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scheduled_agent_job_runs.cache_read_tokens IS 'Tokens served from the prompt cache (claude cache_read_input_tokens, opencode cache.read); null when unreported.';


--
-- Name: COLUMN scheduled_agent_job_runs.cache_write_tokens; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scheduled_agent_job_runs.cache_write_tokens IS 'Tokens written to the prompt cache (claude cache_creation_input_tokens, opencode cache.write); null when unreported.';


--
-- Name: COLUMN scheduled_agent_job_runs.reasoning_tokens; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scheduled_agent_job_runs.reasoning_tokens IS 'Reasoning/thinking tokens accounted separately (opencode tokens.reasoning, grok usage.reasoning_tokens); null when unreported.';


--
-- Name: COLUMN scheduled_agent_job_runs.total_tokens; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scheduled_agent_job_runs.total_tokens IS 'Total tokens: the backend explicit total else input+output when either present; null when nothing reported.';


--
-- Name: COLUMN scheduled_agent_job_runs.cost_usd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scheduled_agent_job_runs.cost_usd IS 'Estimated dollar cost of the run when the backend prices it (claude totalCostUsd, opencode summed cost); null when unpriced.';


--
-- Name: COLUMN scheduled_agent_job_runs.raw_usage; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scheduled_agent_job_runs.raw_usage IS 'The run''s normalized usage payload (NormalizedTokenUsage) as JSONB, retained for audit/debug and future re-derivation.';


--
-- Name: COLUMN scheduled_agent_job_runs.repository_checkout_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scheduled_agent_job_runs.repository_checkout_id IS 'The repository checkout this run targeted at fire time, snapshot from the schedule when the run row is created. Retained independently of the schedule so editing the schedule later does not rewrite this run''s history; set to NULL if the checkout is subsequently deleted (resolved_cwd still records where the run happened). Null for legacy runs and for schedules that use the explicit-cwd/WORKSPACE_ROOT fallback.';


--
-- Name: COLUMN scheduled_agent_job_runs.resolved_cwd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scheduled_agent_job_runs.resolved_cwd IS 'The exact directory the agent CLI was spawned in for this run, after applying the repository_checkout_id -> cwd -> WORKSPACE_ROOT -> process.cwd() precedence and toContainerPath(). This is the authoritative record of where the run actually executed — the schedule''s current target may since have changed. Null for legacy rows created before this column existed.';


--
-- Name: COLUMN scheduled_agent_job_runs.usage_limit_resets_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scheduled_agent_job_runs.usage_limit_resets_at IS 'When the usage limit that stopped this run lifts, as reported by the agent CLI. NULL when the run was not usage-limited or the CLI did not report a reset time.';


--
-- Name: COLUMN scheduled_agent_job_runs.usage_limit_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scheduled_agent_job_runs.usage_limit_type IS 'Raw name of the usage-limit window that stopped this run (five_hour, seven_day, ...), kept as TEXT because the agent CLI adds windows over time. NULL when the run was not usage-limited or the window was not reported.';


--
-- Name: COLUMN scheduled_agent_job_runs.resume_of_run_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scheduled_agent_job_runs.resume_of_run_id IS 'The usage_limited run this run continues, set on the continuation run the processor enqueues after a usage limit (trigger = resume). NULL for every ordinary run. The partial UNIQUE index on this column allows at most one continuation per limited run (the idempotency anchor), and walking it backwards bounds how many times a job is auto-resumed.';


--
-- Name: COLUMN scheduled_agent_job_runs.scheduled_for; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scheduled_agent_job_runs.scheduled_for IS 'The cron slot this run belongs to, for trigger = schedule (including missed rows). Unique per (scheduled_agent_job_id, scheduled_for) among schedule-trigger rows, so a slot is claimed at most once. NULL for manual and resume runs and for runs recorded before migration 141.';


--
-- Name: scheduled_agent_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scheduled_agent_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    prompt text NOT NULL,
    driver_id text NOT NULL,
    model text,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    cron_pattern text,
    timezone text,
    timeout_ms integer,
    enabled boolean DEFAULT true NOT NULL,
    scheduler_key text NOT NULL,
    cwd text,
    owner_user_id uuid,
    last_run_at timestamp with time zone,
    next_run_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    repository_checkout_id uuid,
    misfire_policy text DEFAULT 'skip'::text NOT NULL,
    misfire_threshold_ms integer DEFAULT 600000 NOT NULL,
    schedule_kind text DEFAULT 'cron'::text NOT NULL,
    interval_ms integer,
    run_at timestamp with time zone,
    CONSTRAINT chk_scheduled_agent_jobs_interval_ms CHECK (((interval_ms IS NULL) OR (interval_ms >= 60000))),
    CONSTRAINT chk_scheduled_agent_jobs_misfire_policy CHECK ((misfire_policy = ANY (ARRAY['skip'::text, 'catch_up_once'::text]))),
    CONSTRAINT chk_scheduled_agent_jobs_misfire_threshold_ms CHECK ((misfire_threshold_ms >= 60000)),
    CONSTRAINT chk_scheduled_agent_jobs_schedule_kind CHECK ((((schedule_kind = 'cron'::text) AND (cron_pattern IS NOT NULL)) OR ((schedule_kind = 'interval'::text) AND (interval_ms IS NOT NULL)) OR ((schedule_kind = 'once'::text) AND (run_at IS NOT NULL))))
);


--
-- Name: TABLE scheduled_agent_jobs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.scheduled_agent_jobs IS 'User-defined scheduled agent jobs: a prompt + driver/model/settings run on a cron schedule via one shared BullMQ queue. DB is authoritative; BullMQ repeatable schedulers are a projection reconciled by scheduler_key.';


--
-- Name: COLUMN scheduled_agent_jobs.driver_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scheduled_agent_jobs.driver_id IS 'openthrottle-drivers DRIVER_IDS value (antigravity|claude|codex|cursor|gemini|grok|opencode). Validated app-side via parseDriverId; not CHECK-constrained because the driver set grows.';


--
-- Name: COLUMN scheduled_agent_jobs.settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scheduled_agent_jobs.settings IS 'Exactly the AgentPromptSettings subset (endpoint without apiKey, worktree); validated on write. NOT an arbitrary JSON bag — unknown keys are rejected, and endpoint.apiKey is disallowed (never persist a plaintext key).';


--
-- Name: COLUMN scheduled_agent_jobs.cron_pattern; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scheduled_agent_jobs.cron_pattern IS '5- or 6-field cron pattern, interpreted in timezone (UTC when null). Required when schedule_kind = cron; null for interval and once schedules.';


--
-- Name: COLUMN scheduled_agent_jobs.timeout_ms; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scheduled_agent_jobs.timeout_ms IS 'Per-job worker-layer timeout override; null falls back to SCHEDULED_AGENT_JOBS_TIMEOUT_MS.';


--
-- Name: COLUMN scheduled_agent_jobs.scheduler_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scheduled_agent_jobs.scheduler_key IS 'Stable BullMQ upsertJobScheduler id (scheduled-job:<id>). Unique so reconciliation is idempotent (upsert replaces, never duplicates).';


--
-- Name: COLUMN scheduled_agent_jobs.cwd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scheduled_agent_jobs.cwd IS 'Legacy/explicit process cwd for the agent CLI, used only when repository_checkout_id is NULL; null then falls back to WORKSPACE_ROOT ?? process.cwd(). Deprecated in GraphQL in favour of repositoryCheckoutId — prefer targeting a registered checkout.';


--
-- Name: COLUMN scheduled_agent_jobs.next_run_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scheduled_agent_jobs.next_run_at IS 'Next fire time, read back from the BullMQ scheduler (getJobScheduler) after each upsert/fire; advisory cache, the scheduler is authoritative.';


--
-- Name: COLUMN scheduled_agent_jobs.repository_checkout_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scheduled_agent_jobs.repository_checkout_id IS 'The registered repository checkout this schedule runs in; resolved server-side to a cwd via the checkout''s filesystem_path and toContainerPath() (container-path aware), ownership-checked against owner_user_id. Null means the legacy explicit `cwd` or the WORKSPACE_ROOT fallback is used instead. Set to NULL when the checkout is deleted, which drops the schedule back to that fallback.';


--
-- Name: COLUMN scheduled_agent_jobs.misfire_policy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scheduled_agent_jobs.misfire_policy IS 'What happens to a cron fire that comes due more than misfire_threshold_ms late (server down, or a backed-up queue): skip = record it as a missed run and do not run it; catch_up_once = run the most recent late fire once, recording any earlier ones as missed. A fire within the threshold always runs. Default skip.';


--
-- Name: COLUMN scheduled_agent_jobs.misfire_threshold_ms; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scheduled_agent_jobs.misfire_threshold_ms IS 'How late (ms after its cron slot) a fire may start and still count as on time. At least 60000 so ordinary queue jitter never trips the policy; default 600000 (10 minutes).';


--
-- Name: COLUMN scheduled_agent_jobs.schedule_kind; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scheduled_agent_jobs.schedule_kind IS 'How the schedule fires: cron (cron_pattern in timezone, a BullMQ job scheduler; the default), interval (interval_ms after the previous fire finishes), or once (a single fire at run_at). interval and once fires are single delayed BullMQ jobs; one the server was down for runs once, late, and misfire_policy does not apply to them.';


--
-- Name: COLUMN scheduled_agent_jobs.interval_ms; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scheduled_agent_jobs.interval_ms IS 'For schedule_kind = interval: elapsed milliseconds from the end of one fire to the start of the next (DST-safe, at least 60000). Null for other kinds.';


--
-- Name: COLUMN scheduled_agent_jobs.run_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scheduled_agent_jobs.run_at IS 'For schedule_kind = once: the instant the single fire is due. The schedule is disabled after that fire finishes. Null for other kinds.';


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    filename text NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL,
    checksum text
);


--
-- Name: service_account_credentials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_account_credentials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_account_id uuid NOT NULL,
    prefix text NOT NULL,
    secret_hash text NOT NULL,
    label text,
    expires_at timestamp with time zone,
    last_used_at timestamp with time zone,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE service_account_credentials; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.service_account_credentials IS 'Hashed bearer credentials for service accounts; stores prefix and secret hash only, never the raw secret.';


--
-- Name: service_account_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_account_roles (
    role_id uuid NOT NULL,
    service_account_id uuid NOT NULL
);


--
-- Name: TABLE service_account_roles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.service_account_roles IS 'Join of service accounts to RBAC roles defining effective permissions for machine identities.';


--
-- Name: service_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    disabled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    acting_user_id uuid
);


--
-- Name: TABLE service_accounts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.service_accounts IS 'Named service identities for system-to-system auth (MCP, CI, and Ralph workers).';


--
-- Name: COLUMN service_accounts.acting_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.service_accounts.acting_user_id IS 'The human user this machine identity acts as for user-scoped conveniences (e.g. resolving a plan''s creating workspace against that user''s registered checkouts). NULL means the account acts as no one and those conveniences no-op. A hint, never a permission grant — authorization still comes from service_account_roles. Provisioned for the bootstrap accounts by scripts/bootstrap-default-user.ts; editable via the updateServiceAccount GraphQL mutation.';


--
-- Name: skill_availability_rule_sets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skill_availability_rule_sets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    posture text DEFAULT 'allow'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_skill_availability_rule_sets_posture CHECK ((posture = ANY (ARRAY['allow'::text, 'deny'::text])))
);


--
-- Name: TABLE skill_availability_rule_sets; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.skill_availability_rule_sets IS 'Per-project skill-availability rule set (at most one per project). Carries the single per-project posture; owns zero or more skill_availability_rules. Read by SkillAvailabilityService.getRuleSetForProject to feed resolveSkillAvailability; no rule set ⇒ passthrough. See docs/monorepo/skill-availability-design.md.';


--
-- Name: COLUMN skill_availability_rule_sets.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_availability_rule_sets.id IS 'Surrogate primary key; referenced by skill_availability_rules.rule_set_id.';


--
-- Name: COLUMN skill_availability_rule_sets.project_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_availability_rule_sets.project_id IS 'Owning project (projects.id); cascade-deleted with the project. UNIQUE — at most one rule set per project.';


--
-- Name: COLUMN skill_availability_rule_sets.posture; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_availability_rule_sets.posture IS 'The single per-project posture (precedence rung 3): allow = today''s behavior minus explicit denies; deny = nothing model-invocable except explicit allows. NOT environment-qualified in v1.';


--
-- Name: COLUMN skill_availability_rule_sets.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_availability_rule_sets.created_at IS 'Row creation timestamp.';


--
-- Name: COLUMN skill_availability_rule_sets.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_availability_rule_sets.updated_at IS 'Last-update timestamp, maintained by the update_updated_at_column() trigger.';


--
-- Name: skill_availability_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skill_availability_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rule_set_id uuid NOT NULL,
    tag_allow text[] DEFAULT '{}'::text[] NOT NULL,
    tag_deny text[] DEFAULT '{}'::text[] NOT NULL,
    slug_allow text[] DEFAULT '{}'::text[] NOT NULL,
    slug_deny text[] DEFAULT '{}'::text[] NOT NULL,
    environment text,
    editor text,
    role text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_skill_availability_rules_environment CHECK ((environment = ANY (ARRAY['ci'::text, 'interactive'::text, 'ralph'::text])))
);


--
-- Name: TABLE skill_availability_rules; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.skill_availability_rules IS 'Individual skill-availability rules owned by a rule set. Each rule matches skills by tag (primary) and slug (one-off exceptions) with allow/deny lists, optionally scoped to an environment. Evaluated at precedence rungs 1-2 by resolveSkillAvailability. See docs/monorepo/skill-availability-design.md.';


--
-- Name: COLUMN skill_availability_rules.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_availability_rules.id IS 'Surrogate primary key; used as the stable rule identifier in resolver provenance strings and tie-breaks.';


--
-- Name: COLUMN skill_availability_rules.rule_set_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_availability_rules.rule_set_id IS 'Owning rule set (skill_availability_rule_sets.id); cascade-deleted with the rule set.';


--
-- Name: COLUMN skill_availability_rules.tag_allow; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_availability_rules.tag_allow IS 'Tags this rule allows (rung 2); empty array when none. Validated against the workspace vocabulary at write time.';


--
-- Name: COLUMN skill_availability_rules.tag_deny; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_availability_rules.tag_deny IS 'Tags this rule denies (rung 2); empty array when none. Validated against the workspace vocabulary at write time.';


--
-- Name: COLUMN skill_availability_rules.slug_allow; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_availability_rules.slug_allow IS 'Skill slugs this rule allows (rung 1, one-off exceptions); empty array when none.';


--
-- Name: COLUMN skill_availability_rules.slug_deny; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_availability_rules.slug_deny IS 'Skill slugs this rule denies (rung 1, one-off exceptions); empty array when none.';


--
-- Name: COLUMN skill_availability_rules.environment; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_availability_rules.environment IS 'Environment qualifier (rung 0 pre-filter): NULL applies to all environments; a value (ci | interactive | ralph) scopes the rule to that environment.';


--
-- Name: COLUMN skill_availability_rules.editor; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_availability_rules.editor IS 'Reserved-inert nullable column: exists so storage can carry an editor axis forward, but the v1 resolver ignores it entirely.';


--
-- Name: COLUMN skill_availability_rules.role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_availability_rules.role IS 'Reserved-inert nullable column: exists so storage can carry a role (persona) axis forward, but the v1 resolver ignores it entirely.';


--
-- Name: COLUMN skill_availability_rules.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_availability_rules.created_at IS 'Row creation timestamp.';


--
-- Name: COLUMN skill_availability_rules.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_availability_rules.updated_at IS 'Last-update timestamp, maintained by the update_updated_at_column() trigger.';


--
-- Name: skill_usage_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skill_usage_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    skill_name text NOT NULL,
    args text,
    session_id text,
    cwd text,
    git_branch text,
    scope text NOT NULL,
    invocation_path text,
    privacy_level text DEFAULT 'truncated'::text NOT NULL,
    agent_id text,
    agent_type text,
    tool_use_id text,
    prompt_id text,
    hook_event_name text,
    occurred_at timestamp with time zone NOT NULL,
    received_at timestamp with time zone DEFAULT now() NOT NULL,
    source text,
    user_id uuid,
    is_fixture boolean DEFAULT false NOT NULL,
    duplicate_of_id uuid,
    CONSTRAINT skill_usage_events_privacy_level_check CHECK ((privacy_level = ANY (ARRAY['name-only'::text, 'truncated'::text, 'full'::text]))),
    CONSTRAINT skill_usage_events_scope_check CHECK ((scope = ANY (ARRAY['ours'::text, 'personal'::text, 'third-party'::text])))
);


--
-- Name: TABLE skill_usage_events; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.skill_usage_events IS 'Harness-captured skill invocations for OpenThrottle observability. One immutable row per Skill-tool or slash invocation (ours, personal and third-party). Args arrive already privacy-processed by the client; server stores as-sent.';


--
-- Name: COLUMN skill_usage_events.skill_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_usage_events.skill_name IS 'Skill identifier from the harness payload (e.g. ot-plans, vercel:deploy).';


--
-- Name: COLUMN skill_usage_events.args; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_usage_events.args IS 'Skill args after client privacy seam (truncated/redacted by default). Null when privacy_level is name-only. Server must not re-expand.';


--
-- Name: COLUMN skill_usage_events.session_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_usage_events.session_id IS 'Harness session id when present; correlates invocations within one agent session.';


--
-- Name: COLUMN skill_usage_events.cwd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_usage_events.cwd IS 'Working directory reported by the harness at invocation time.';


--
-- Name: COLUMN skill_usage_events.git_branch; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_usage_events.git_branch IS 'Git branch at capture time (best-effort from the hook).';


--
-- Name: COLUMN skill_usage_events.scope; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_usage_events.scope IS 'Who the invocation belongs to: ours = authored under the repo''s skills/ directory, so every checkout has it; personal = authored by the invoking user under their personal skills root (~/.openthrottle/skills or OPENTHROTTLE_PERSONAL_SKILLS_DIR), on disk and invokable but outside the repo; third-party = plugin-namespaced (name contains :) or installed from elsewhere. Enforced by skill_usage_events_scope_check. Rows are never retroactively reclassified: personal roots are per-user and unresolvable server-side, so invocations captured before the personal member existed remain third-party. Distinct from the /agents registry provenance vocabulary (committed | installed | external), which answers where the file came from rather than who the invocation belongs to.';


--
-- Name: COLUMN skill_usage_events.invocation_path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_usage_events.invocation_path IS 'How the skill was invoked: skill_tool (Skill tool / PreToolUse) or slash (UserPromptExpansion).';


--
-- Name: COLUMN skill_usage_events.privacy_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_usage_events.privacy_level IS 'Client privacy level applied before ingest: name-only | truncated | full. Fixed default is truncated for this plan.';


--
-- Name: COLUMN skill_usage_events.agent_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_usage_events.agent_id IS 'Subagent id when the Skill call happened inside a nested agent; null for top-level.';


--
-- Name: COLUMN skill_usage_events.agent_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_usage_events.agent_type IS 'Subagent type (e.g. general-purpose) when present.';


--
-- Name: COLUMN skill_usage_events.tool_use_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_usage_events.tool_use_id IS 'Harness tool_use_id for the Skill call when present.';


--
-- Name: COLUMN skill_usage_events.prompt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_usage_events.prompt_id IS 'Harness prompt_id when present.';


--
-- Name: COLUMN skill_usage_events.hook_event_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_usage_events.hook_event_name IS 'Hook that captured the event (PreToolUse or UserPromptExpansion).';


--
-- Name: COLUMN skill_usage_events.occurred_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_usage_events.occurred_at IS 'Client-reported invocation timestamp (JSONL timestamp). Primary axis for time-window queries.';


--
-- Name: COLUMN skill_usage_events.received_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_usage_events.received_at IS 'Server receipt time; set on insert. Used for lag/debug, not the usage-over-time axis.';


--
-- Name: COLUMN skill_usage_events.source; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_usage_events.source IS 'Producer id of the tool/adapter that captured this invocation (e.g. claude-code, cursor). Null for rows ingested before source tracking; stamped by the per-tool skill-usage adapter.';


--
-- Name: COLUMN skill_usage_events.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_usage_events.user_id IS 'The human user this invocation is attributed to, resolved server-side at ingest from the authenticated principal (a human JWT sub directly; a service account via its acting_user_id). NULL means ingest had no resolvable principal, or the row predates this column — never that no one ran it. Never backfilled by heuristic: a guessed actor is indistinguishable from a recorded one afterwards, whereas a NULL is honest. Consumers must fall back to the cwd/git_branch heuristic when this is NULL rather than dropping the row.';


--
-- Name: COLUMN skill_usage_events.is_fixture; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_usage_events.is_fixture IS 'True for instrumentation probes recorded while bringing the telemetry pipeline up, not real skill usage. A closed set of 8 hand-run session ids (7 rows present, all attributed to ot-plans). /usage excludes these by default so they stop inflating invocation counts; they are retained rather than deleted because they are the evidence the pipeline worked.';


--
-- Name: COLUMN skill_usage_events.duplicate_of_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_usage_events.duplicate_of_id IS 'Set when this row is a duplicate capture of another event (same idempotency key), pointing at the row that survives. Flagged rows are kept for history but excluded from every /usage aggregate. Backfilled by migration 134; new duplicates are refused at insert by the unique indexes instead.';


--
-- Name: skill_usage_outcomes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skill_usage_outcomes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    skill_name text NOT NULL,
    session_id text,
    tool_use_id text,
    outcome text NOT NULL,
    duration_ms integer,
    cwd text,
    git_branch text,
    scope text DEFAULT 'ours'::text NOT NULL,
    occurred_at timestamp with time zone NOT NULL,
    received_at timestamp with time zone DEFAULT now() NOT NULL,
    source text,
    capture_model text DEFAULT 'reported_v1'::text NOT NULL,
    CONSTRAINT skill_usage_outcomes_capture_model_check CHECK ((capture_model = ANY (ARRAY['legacy_assumed_success'::text, 'reported_v1'::text]))),
    CONSTRAINT skill_usage_outcomes_duration_ms_check CHECK (((duration_ms IS NULL) OR (duration_ms >= 0))),
    CONSTRAINT skill_usage_outcomes_outcome_check CHECK ((outcome = ANY (ARRAY['abandoned'::text, 'error'::text, 'session_ended'::text, 'success'::text]))),
    CONSTRAINT skill_usage_outcomes_scope_check CHECK ((scope = ANY (ARRAY['ours'::text, 'personal'::text, 'third-party'::text])))
);


--
-- Name: TABLE skill_usage_outcomes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.skill_usage_outcomes IS 'Opt-in outcome/duration enrichment for OpenThrottle-authored skills. Correlates to skill_usage_events starts by session_id + skill_name; never replaces harness PreToolUse capture.';


--
-- Name: COLUMN skill_usage_outcomes.skill_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_usage_outcomes.skill_name IS 'Skill identifier matching the start event (skills/ authored names).';


--
-- Name: COLUMN skill_usage_outcomes.session_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_usage_outcomes.session_id IS 'Harness session id when known; primary correlation key with skill_name.';


--
-- Name: COLUMN skill_usage_outcomes.tool_use_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_usage_outcomes.tool_use_id IS 'Optional harness tool_use_id for tighter start↔outcome correlation.';


--
-- Name: COLUMN skill_usage_outcomes.outcome; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_usage_outcomes.outcome IS 'success | error — QUALITY claims, only ever written by a deliberate reporter that knows how the work went. session_ended — the automatic session-end path; the session that loaded this skill ended normally, no quality claim. abandoned — the stale-session sweep; the process died without a clean end. Only success and error belong in an "outcomes reported" numerator. Enforced by skill_usage_outcomes_outcome_check.';


--
-- Name: COLUMN skill_usage_outcomes.duration_ms; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_usage_outcomes.duration_ms IS 'Wall-clock duration from skill start to outcome emit, reported ONLY by a deliberate reporter. Null on every automatic path: no harness hook brackets a skill''s own work (PostToolUse on Skill fires when the skill file is injected, not when its work completes), so the only figure available there is session-tail length, which is not this skill''s duration.';


--
-- Name: COLUMN skill_usage_outcomes.scope; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_usage_outcomes.scope IS 'Mirrors skill_usage_events.scope (ours | personal | third-party) for filter parity with starts. Normally ours or personal, since outcome enrichment requires a skill we can instrument. Never retroactively reclassified — see skill_usage_events.scope.';


--
-- Name: COLUMN skill_usage_outcomes.occurred_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_usage_outcomes.occurred_at IS 'Client-reported outcome timestamp. Primary axis for time-window correlation.';


--
-- Name: COLUMN skill_usage_outcomes.received_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_usage_outcomes.received_at IS 'Server receipt time; set on insert.';


--
-- Name: COLUMN skill_usage_outcomes.source; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_usage_outcomes.source IS 'Producer id of the tool/adapter that recorded this outcome (e.g. claude-code, cursor). Null for rows ingested before source tracking; stamped by the per-tool skill-usage adapter. Matches skill_usage_events.source, so the two tables join on producer as well as on session_id + skill_name.';


--
-- Name: COLUMN skill_usage_outcomes.capture_model; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_usage_outcomes.capture_model IS 'Which capture contract wrote this row. legacy_assumed_success = written before migration 123, when the automatic session-end path hardcoded outcome=success; its outcome value is an assumption, not a measurement, and /usage excludes these rows from every count. reported_v1 = written under the honest contract. Backfilled once, never rewritten — the point is to tell a measured value from an assumed one.';


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid NOT NULL,
    stripe_customer_id text,
    stripe_subscription_id text,
    stripe_price_id text NOT NULL,
    status text NOT NULL,
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    cancel_at_period_end boolean DEFAULT false NOT NULL
);


--
-- Name: TABLE subscriptions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.subscriptions IS 'Stripe subscription state and billing periods mapped to users for paid entitlements.';


--
-- Name: tag_action_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tag_action_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    project_id uuid,
    tag_all text[] DEFAULT '{}'::text[] NOT NULL,
    status public.plan_task_status,
    environment text,
    action_type text NOT NULL,
    action_payload jsonb NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    title text NOT NULL,
    CONSTRAINT chk_tag_action_rules_action_type CHECK ((action_type = ANY (ARRAY['inject-task'::text, 'availability-exception'::text]))),
    CONSTRAINT chk_tag_action_rules_environment CHECK ((environment = ANY (ARRAY['ci'::text, 'interactive'::text, 'ralph'::text])))
);


--
-- Name: TABLE tag_action_rules; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tag_action_rules IS 'Declarative tag→action rules, owned per user. A rule matches a plan when enabled AND project (NULL or equal) AND environment (NULL or equal) AND tag_all ⊆ effective tag set AND status (NULL or equal); all matched actions dispatch (no global priority). Evaluated by the pure evaluateTagActionRules function inside the plan-rules:evaluate worker; applications are ledgered in rule_applications. See docs/monorepo/plan-task-tags-rules-design.md.';


--
-- Name: COLUMN tag_action_rules.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tag_action_rules.id IS 'Surrogate primary key; referenced by rule_applications.rule_id and used in provenance strings ("rule:<id>").';


--
-- Name: COLUMN tag_action_rules.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tag_action_rules.user_id IS 'Owning user (users.id); cascade-deleted with the user. Rules are per-user (workspace), following the user_skill_tags precedent.';


--
-- Name: COLUMN tag_action_rules.project_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tag_action_rules.project_id IS 'Optional project scope (projects.id): NULL matches every project; a value restricts the rule to that project. SET NULL on project deletion widens the rule rather than dropping it.';


--
-- Name: COLUMN tag_action_rules.tag_all; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tag_action_rules.tag_all IS 'Tags that must ALL be present in the plan''s effective tag set (plan ∪ tasks) for the rule to match; empty array matches every plan. Unknown tags never match (graceful degrade).';


--
-- Name: COLUMN tag_action_rules.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tag_action_rules.status IS 'Optional plan-status qualifier: NULL matches any status; a value requires the plan to be in that status at evaluation time.';


--
-- Name: COLUMN tag_action_rules.environment; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tag_action_rules.environment IS 'Optional environment qualifier: NULL applies to every environment; a value (ci | interactive | ralph) scopes the rule to that environment.';


--
-- Name: COLUMN tag_action_rules.action_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tag_action_rules.action_type IS 'Which ActionExecutor handles the payload: inject-task (require/inject a task into the plan) or availability-exception (ephemeral skill-availability resolver inputs on plan-context reads).';


--
-- Name: COLUMN tag_action_rules.action_payload; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tag_action_rules.action_payload IS 'Typed action parameters, Zod-validated per action_type at write time (inject-task: skillSlug/placement/anchor/templates, placement first|last|before|after with before/after requiring an anchor {taskId|skillSlug|titleMatch}; availability-exception: tagAllow/tagDeny/slugAllow/slugDeny).';


--
-- Name: COLUMN tag_action_rules.enabled; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tag_action_rules.enabled IS 'Soft on/off switch; disabled rules never match. Preferred over deletion so the rule_applications ledger history survives.';


--
-- Name: COLUMN tag_action_rules.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tag_action_rules.created_at IS 'Row creation timestamp.';


--
-- Name: COLUMN tag_action_rules.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tag_action_rules.updated_at IS 'Last-update timestamp, maintained by the update_updated_at_column() trigger.';


--
-- Name: COLUMN tag_action_rules.title; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tag_action_rules.title IS 'Human-readable label for the rule, shown as the primary text in the rules list/table and edited on the dedicated create/update routes. Required and non-empty (non-empty enforced in TagActionRulesService); NOT unique. Added NOT NULL with no default because the table was empty at migration time.';


--
-- Name: task_embeddings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_embeddings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    embedding public.vector(1536),
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    task_id uuid NOT NULL
);


--
-- Name: TABLE task_embeddings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.task_embeddings IS 'Vector embeddings for task content chunks used for semantic search over tasks.';


--
-- Name: task_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    tag text NOT NULL,
    dimension text NOT NULL,
    source text NOT NULL,
    confidence numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_task_tags_dimension CHECK ((dimension = ANY (ARRAY['domain'::text, 'phase'::text]))),
    CONSTRAINT chk_task_tags_source CHECK ((source = ANY (ARRAY['human'::text, 'agent'::text, 'server-llm'::text]))),
    CONSTRAINT chk_task_tags_tag_kebab CHECK ((tag ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text))
);


--
-- Name: TABLE task_tags; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.task_tags IS 'Tags attached to tasks (one row per task+tag). Same shape and semantics as plan_tags: service-layer vocabulary validation (no FK), identity-derived source for the provenance ladder. Feeds the effective-tag-set rollup (task ∪ plan) and tag_action_rules matching. See docs/monorepo/plan-task-tags-rules-design.md.';


--
-- Name: COLUMN task_tags.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.task_tags.id IS 'Surrogate primary key.';


--
-- Name: COLUMN task_tags.task_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.task_tags.task_id IS 'Tagged task (tasks.id); cascade-deleted with the task.';


--
-- Name: COLUMN task_tags.tag; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.task_tags.tag IS 'Kebab-case tag slug (matches AGENT_ASSET_SLUG_PATTERN in @openthrottle/openthrottle-skills). Unique per task; validated against the caller''s vocabulary at write time.';


--
-- Name: COLUMN task_tags.dimension; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.task_tags.dimension IS 'Vocabulary axis, denormalized from user_skill_tags at write time: domain (subject area) or phase (lifecycle stage).';


--
-- Name: COLUMN task_tags.source; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.task_tags.source IS 'Writing identity class, derived server-side (never caller-supplied): human (developer-app session), agent (agent token), or server-llm (tagging service account). Ranked human > agent > server-llm for replace/remove arbitration.';


--
-- Name: COLUMN task_tags.confidence; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.task_tags.confidence IS 'Model confidence for server-llm rows (0-1); NULL for human/agent rows. Stored for observability; non-gating in v1.';


--
-- Name: COLUMN task_tags.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.task_tags.created_at IS 'Row creation timestamp.';


--
-- Name: COLUMN task_tags.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.task_tags.updated_at IS 'Last-update timestamp, maintained by the update_updated_at_column() trigger.';


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    description text,
    plan_id uuid NOT NULL,
    requirements jsonb DEFAULT '[]'::jsonb NOT NULL,
    title text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    assignee text,
    summary text,
    project text,
    project_id uuid,
    status public.plan_task_status DEFAULT 'PENDING'::public.plan_task_status CONSTRAINT tasks_status_new_not_null NOT NULL,
    sort_order integer NOT NULL,
    completed_at timestamp with time zone,
    parent_task_id uuid,
    hook_role text,
    hook_scope text,
    hook_source text,
    skill_slug text,
    wave integer,
    CONSTRAINT chk_tasks_hook_each_plan_scoped CHECK (((hook_scope IS DISTINCT FROM 'each'::text) OR (parent_task_id IS NULL))),
    CONSTRAINT chk_tasks_hook_role CHECK (((hook_role IS NULL) OR (hook_role = ANY (ARRAY['before'::text, 'after'::text])))),
    CONSTRAINT chk_tasks_hook_role_coherence CHECK (((hook_role IS NOT NULL) OR ((parent_task_id IS NULL) AND (hook_scope IS NULL) AND (hook_source IS NULL) AND (skill_slug IS NULL)))),
    CONSTRAINT chk_tasks_hook_scope CHECK (((hook_scope IS NULL) OR (hook_scope = ANY (ARRAY['once'::text, 'each'::text])))),
    CONSTRAINT chk_tasks_hook_skill_slug CHECK ((((hook_source = 'skill'::text) AND (skill_slug IS NOT NULL)) OR ((hook_source IS DISTINCT FROM 'skill'::text) AND (skill_slug IS NULL)))),
    CONSTRAINT chk_tasks_hook_source CHECK (((hook_source IS NULL) OR (hook_source = ANY (ARRAY['template'::text, 'skill'::text])))),
    CONSTRAINT chk_tasks_wave_positive CHECK (((wave IS NULL) OR (wave >= 1)))
);


--
-- Name: TABLE tasks; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tasks IS 'Plan-scoped work items with status, requirements, and titles for execution and traceability.';


--
-- Name: COLUMN tasks.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tasks.status IS 'Definitive enum: BACKLOG, BLOCKED, CANCELED, COMPLETED, IN_PROGRESS, PENDING, PROMOTED, SKIPPED (PROMOTED: set by promote_task, the work continued as its own plan).';


--
-- Name: COLUMN tasks.sort_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tasks.sort_order IS 'Execution/list order within plan (gap-based: 1000, 2000, …). UNIQUE per plan_id. Canonical sort: sort_order ASC, created_at ASC.';


--
-- Name: COLUMN tasks.completed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tasks.completed_at IS 'Set once when status transitions into COMPLETED (app write path only); cleared if status leaves COMPLETED. Immutable to later edits and to BEFORE UPDATE updated_at triggers. Used by daily_stats for day-range completion counts.';


--
-- Name: COLUMN tasks.parent_task_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tasks.parent_task_id IS 'Anchor task for a task-level lifecycle hook (self-FK, ON DELETE CASCADE). NULL for regular tasks and for plan-level hooks. See docs/monorepo/lifecycle-hooks-design.md.';


--
-- Name: COLUMN tasks.hook_role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tasks.hook_role IS 'Lifecycle-hook marker: NULL = regular task; ''before''/''after'' = a hook task. With parent_task_id NULL it is a plan-level hook (beforeAll/afterAll, or beforeEach/afterEach when hook_scope=''each''); with parent_task_id set it is a per-task hook.';


--
-- Name: COLUMN tasks.hook_scope; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tasks.hook_scope IS 'Plan-level hook expansion mode: ''once'' runs a single time (beforeAll/afterAll); ''each'' expands onto every task at run start (beforeEach/afterEach). Only valid when parent_task_id IS NULL. NULL for regular tasks and task-level hooks.';


--
-- Name: COLUMN tasks.hook_source; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tasks.hook_source IS 'How a hook task''s body is produced: ''template'' (inline title/description) or ''skill'' (references skill_slug, executed via the job-run-hooks runner). NULL for regular tasks.';


--
-- Name: COLUMN tasks.skill_slug; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tasks.skill_slug IS 'Kebab-case skill slug when hook_source=''skill'' (the validation/prompt skill the hook runs); NULL otherwise. Enforced by chk_tasks_hook_skill_slug.';


--
-- Name: COLUMN tasks.wave; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tasks.wave IS 'Coarse concurrency layer within a plan, nullable. NULL means unassigned (runs alone, in sort_order position) -- never wave zero. Tasks sharing a wave number are the author''s claim that they may be worked concurrently; sort_order remains the canonical order and the tiebreaker within a wave. No UNIQUE constraint: several tasks sharing a wave is the point. Hook tasks (hook_role non-NULL) always stay NULL. Not consumed by the executor yet -- see docs/openthrottle/task-wave-encoding.md.';


--
-- Name: user_disabled_agent_clis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_disabled_agent_clis (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    backend text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    model text
);


--
-- Name: TABLE user_disabled_agent_clis; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_disabled_agent_clis IS 'Per-user set of DISABLED agent CLI backends. Presence-as-disabled: a row means the user turned that agent off; absence means enabled. Empty table = the default all-enabled posture (no backfill). Disabled agents are hidden from chat/model pickers and rejected when starting new runs.';


--
-- Name: COLUMN user_disabled_agent_clis.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_disabled_agent_clis.user_id IS 'Owner of the preference. User-scoped; cascades on user delete.';


--
-- Name: COLUMN user_disabled_agent_clis.backend; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_disabled_agent_clis.backend IS 'Driver id / backend discriminator (e.g. ''claude'', ''cursor''), validated server-side against the @openthrottle/openthrottle-drivers registry (isDriverId) before insert. No FK because the allowlist is code, not a table.';


--
-- Name: COLUMN user_disabled_agent_clis.model; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_disabled_agent_clis.model IS 'Which model this disable row targets. NULL = the WHOLE agent is disabled (the original agent-level semantics; no backfill needed). A non-null value is the opaque driver-supplied model id (e.g. ''gpt-5.2'') for a single disabled model within an otherwise-enabled agent. An agent-level OFF (model IS NULL) hard-overrides per-model rows downstream.';


--
-- Name: user_favorite_agent_models; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_favorite_agent_models (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    backend text NOT NULL,
    model text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE user_favorite_agent_models; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_favorite_agent_models IS 'Per-user set of FAVORITED agent-CLI models. Presence-as-favorite: a row (user_id, backend, model) means the user starred that model; absence means not-favorited. Favorite is orthogonal to enablement — it does not enable a disabled model; it only floats the model to the top of / highlights it in chat/model pickers and run selection. A favorite on a later-disabled model is inert but persists (revives when re-enabled).';


--
-- Name: COLUMN user_favorite_agent_models.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_favorite_agent_models.user_id IS 'Owner of the preference. User-scoped; cascades on user delete.';


--
-- Name: COLUMN user_favorite_agent_models.backend; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_favorite_agent_models.backend IS 'Driver id / backend discriminator (e.g. ''claude'', ''cursor''), validated server-side against the @openthrottle/openthrottle-drivers registry (isDriverId) before insert. No FK because the allowlist is code, not a table.';


--
-- Name: COLUMN user_favorite_agent_models.model; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_favorite_agent_models.model IS 'Opaque driver-supplied model id as returned by discoverAgentClis (e.g. ''gpt-5.2''). Not validated against a catalog — models are probed and can change between scans; a favorite for a model not currently discovered is ignored at read time (never auto-pruned) and revives if the model reappears.';


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    role_id uuid NOT NULL,
    user_id uuid NOT NULL
);


--
-- Name: TABLE user_roles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_roles IS 'Join of users to RBAC roles determining effective admin permissions in the app.';


--
-- Name: user_skill_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_skill_tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    tag text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    dimension text DEFAULT 'domain'::text NOT NULL,
    CONSTRAINT chk_user_skill_tags_dimension CHECK ((dimension = ANY (ARRAY['domain'::text, 'phase'::text]))),
    CONSTRAINT chk_user_skill_tags_tag_kebab CHECK ((tag ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text))
);


--
-- Name: TABLE user_skill_tags; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_skill_tags IS 'Per-user skill-tag vocabulary (DB-authoritative controlled set). Seeded on first read from DEFAULT_SKILL_TAG_VOCABULARY in @openthrottle/openthrottle-skills; users add/rename/remove their own tags. Backs skill-availability rules that reference skills by tag. See docs/monorepo/skill-availability-design.md.';


--
-- Name: COLUMN user_skill_tags.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_skill_tags.id IS 'Surrogate primary key.';


--
-- Name: COLUMN user_skill_tags.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_skill_tags.user_id IS 'Owning user (users.id); cascade-deleted with the user. Vocabulary is per-user, following the user_workspace_settings precedent.';


--
-- Name: COLUMN user_skill_tags.tag; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_skill_tags.tag IS 'Kebab-case tag slug (matches AGENT_ASSET_SLUG_PATTERN in @openthrottle/openthrottle-skills). Unique per user.';


--
-- Name: COLUMN user_skill_tags.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_skill_tags.created_at IS 'Row creation timestamp.';


--
-- Name: COLUMN user_skill_tags.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_skill_tags.updated_at IS 'Last-update timestamp, maintained by the update_updated_at_column() trigger.';


--
-- Name: COLUMN user_skill_tags.dimension; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_skill_tags.dimension IS 'Vocabulary axis for this tag: domain (subject area; the only dimension skills may carry) or phase (plan/task lifecycle stage; never attaches to skills). UNIQUE (user_id, tag) spans dimensions, so a tag name lives in exactly one dimension per user.';


--
-- Name: user_workspace_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_workspace_settings (
    user_id uuid NOT NULL,
    contact_display_name text,
    contact_email text,
    enabled_editors jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE user_workspace_settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_workspace_settings IS 'Per-user workspace profile: contact fields and enabled editor preferences for the developer UI.';


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    email text,
    github_username text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    password_hash text,
    disabled_at timestamp with time zone
);


--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.users IS 'User accounts keyed by GitHub username for authentication, subscriptions, and plan or task assignee linkage.';


--
-- Name: COLUMN users.disabled_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.disabled_at IS 'When set, user is disabled and login is rejected; null means active.';


--
-- Name: work_artifacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_artifacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    type text NOT NULL,
    external_key text NOT NULL,
    payload jsonb NOT NULL,
    lifecycle text,
    verification text DEFAULT 'unverified'::text NOT NULL,
    verified_at timestamp with time zone,
    source text NOT NULL,
    message text,
    produced_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_work_artifacts_source CHECK ((source = ANY (ARRAY['adapter'::text, 'agent'::text, 'human'::text, 'legacy'::text, 'server'::text]))),
    CONSTRAINT chk_work_artifacts_verification CHECK ((verification = ANY (ARRAY['orphaned'::text, 'unverified'::text, 'verified'::text])))
);


--
-- Name: TABLE work_artifacts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.work_artifacts IS 'Typed outputs produced within a work session (git_commit, pull_request, document, deployment, status_change, …). Payload is per-type JSONB validated in app code; identity/dedupe/lookups ride (type, external_key) — idempotent types upsert on it, event types (status_change) append a discriminator so each transition is its own row. verification records the claims-vs-facts state: agent-reported claims start unverified, server-witnessed events are born verified. lifecycle is a per-type vocabulary (e.g. git_commit created→landed).';


--
-- Name: COLUMN work_artifacts.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_artifacts.id IS 'Surrogate primary key.';


--
-- Name: COLUMN work_artifacts.session_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_artifacts.session_id IS 'The session that produced this artifact (work_sessions.id); cascade-deleted with the session.';


--
-- Name: COLUMN work_artifacts.type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_artifacts.type IS 'Artifact type, resolved against the server-side type registry: git_commit | pull_request | document | deployment | status_change | … . Each type declares its payload schema, lifecycle vocabulary, and dedupe identity (idempotent | event).';


--
-- Name: COLUMN work_artifacts.external_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_artifacts.external_key IS 'Per-type identity key. Idempotent types: canonical id (e.g. github:OpenThrottle/monorepo@<sha>). Event types: transition-discriminated (e.g. task:<id>:COMPLETED:<seq>) so repeated events append rather than upsert.';


--
-- Name: COLUMN work_artifacts.payload; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_artifacts.payload IS 'Per-type structured payload (JSONB), validated in app code by the type registry (zod). E.g. git_commit {repo, sha, landed_sha?}; status_change {entity, id, from, to}.';


--
-- Name: COLUMN work_artifacts.lifecycle; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_artifacts.lifecycle IS 'Per-type lifecycle state; NULL for types without one. E.g. git_commit created→landed (landed fires downstream triggers); document draft→published.';


--
-- Name: COLUMN work_artifacts.verification; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_artifacts.verification IS 'Claims-vs-facts state: unverified (a claim), verified (a verifier confirmed it, or a first-party server-witnessed event born verified), orphaned (verifier could not reconcile it, e.g. rebase/branch drift).';


--
-- Name: COLUMN work_artifacts.verified_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_artifacts.verified_at IS 'When verification last transitioned to verified; NULL while unverified/orphaned.';


--
-- Name: COLUMN work_artifacts.source; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_artifacts.source IS 'What wrote this artifact: agent (self-reported via MCP), human (manual attach), adapter (a verifier/scanner e.g. git trailer harvest), server (first-party server-witnessed event, e.g. status_change), legacy (commit_links migration backfill).';


--
-- Name: COLUMN work_artifacts.message; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_artifacts.message IS 'Optional human-readable note (e.g. commit message carried from a linked commit).';


--
-- Name: COLUMN work_artifacts.produced_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_artifacts.produced_at IS 'When the underlying work was produced (commit time, mutation time). Drives activity ordering; distinct from created_at (row insert time).';


--
-- Name: COLUMN work_artifacts.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_artifacts.created_at IS 'Row creation timestamp.';


--
-- Name: work_session_subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_session_subjects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    task_id uuid,
    attached_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE work_session_subjects; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.work_session_subjects IS 'Session ↔ plan/task association (many-to-many). Task-level subject sets both plan_id and task_id; plan-level leaves task_id NULL. Subjectless sessions have zero rows here; retroactive attach (incl. chat→plan promotion) is an INSERT — the session never mutates.';


--
-- Name: COLUMN work_session_subjects.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_session_subjects.id IS 'Surrogate primary key.';


--
-- Name: COLUMN work_session_subjects.session_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_session_subjects.session_id IS 'The session being attributed to a subject (work_sessions.id); cascade-deleted with the session.';


--
-- Name: COLUMN work_session_subjects.plan_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_session_subjects.plan_id IS 'The subject plan (plans.id); always populated (every task belongs to a plan). Cascade-deleted with the plan.';


--
-- Name: COLUMN work_session_subjects.task_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_session_subjects.task_id IS 'The subject task (tasks.id) for a task-level subject; NULL for a plan-level subject. Cascade-deleted with the task. The unique index treats NULL as the zero-uuid sentinel so plan-level rows dedupe too.';


--
-- Name: COLUMN work_session_subjects.attached_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_session_subjects.attached_at IS 'When this subject was attached (creation or retroactive promotion).';


--
-- Name: work_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_user_id uuid,
    actor_service_account_id uuid,
    on_behalf_of_user_id uuid,
    on_behalf_of_verified boolean DEFAULT false NOT NULL,
    tool_name text NOT NULL,
    tool_version text,
    model text,
    external_ref text,
    plan_run_id uuid,
    conversation_id uuid,
    summary text,
    closed_by text,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_work_sessions_closed_by CHECK (((closed_by IS NULL) OR (closed_by = ANY (ARRAY['explicit'::text, 'sweeper'::text, 'instant'::text])))),
    CONSTRAINT chk_work_sessions_one_actor CHECK ((num_nonnulls(actor_user_id, actor_service_account_id) = 1))
);


--
-- Name: TABLE work_sessions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.work_sessions IS 'Append-only work-ledger spine: one row per unit of work (Ralph run, MCP session, human mutation) with actor (user XOR service account), tooling fingerprint, and lifecycle timestamps. Subjectless sessions are first-class (attach a plan/task later via work_session_subjects). Only ended_at/closed_by mutate after creation. Guarantees the ledger is built on: docs/monorepo/work-ledger-sessions.md.';


--
-- Name: COLUMN work_sessions.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_sessions.id IS 'Surrogate primary key.';


--
-- Name: COLUMN work_sessions.actor_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_sessions.actor_user_id IS 'Who authenticated, when the principal is a human (users.id, JWT sub). Exactly one of actor_user_id / actor_service_account_id is set (chk_work_sessions_one_actor). NO ACTION on delete — users are soft-deleted (disabled_at), history keeps its actor.';


--
-- Name: COLUMN work_sessions.actor_service_account_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_sessions.actor_service_account_id IS 'Who authenticated, when the principal is a machine (service_accounts.id). NOT pinned to the seeded openthrottle-mcp account — keeps per-machine credential minting open, the deferred path to making on_behalf_of a verified fact for MCP sessions too.';


--
-- Name: COLUMN work_sessions.on_behalf_of_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_sessions.on_behalf_of_user_id IS 'The human the work is for, when the actor is a service account (e.g. Ralph running a user-enqueued plan). Claim vs fact carried by on_behalf_of_verified.';


--
-- Name: COLUMN work_sessions.on_behalf_of_verified; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_sessions.on_behalf_of_verified IS 'TRUE when on_behalf_of is a verified fact (Ralph inherits it from plan_runs.actor_user_id, itself stamped from an authenticated principal); FALSE for an unverified hint (MCP GITHUB_USER). Only a value the server stamped from an authenticated user is ever a fact; anything a client declares is a hint.';


--
-- Name: COLUMN work_sessions.tool_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_sessions.tool_name IS 'What produced the work: developer-app | openthrottle-mcp | workflow-ralph | MCP clientInfo.name (claude-code, cursor, …).';


--
-- Name: COLUMN work_sessions.tool_version; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_sessions.tool_version IS 'Tool/client version (e.g. MCP clientInfo.version); nullable.';


--
-- Name: COLUMN work_sessions.model; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_sessions.model IS 'Model identifier when an agent did the work (e.g. claude-fable-5); NULL for humans.';


--
-- Name: COLUMN work_sessions.external_ref; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_sessions.external_ref IS 'External correlation id: BullMQ job id, agent session id, WORKTREE_ID + pid, etc.';


--
-- Name: COLUMN work_sessions.plan_run_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_sessions.plan_run_id IS 'Bridges to the plan_runs queue-audit record when this session is a Ralph run (not absorbed — the ledger is a view of it). SET NULL if the run row is removed.';


--
-- Name: COLUMN work_sessions.conversation_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_sessions.conversation_id IS 'Bridges to the agent_conversations transcript when this session is a chat. Substrate for chat→plan promotion, which attaches a plan to the existing session rather than creating a new one. SET NULL if the conversation is removed.';


--
-- Name: COLUMN work_sessions.summary; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_sessions.summary IS 'Short human-legible summary, set at end_session/promotion; gives sessions that were never promoted to a plan a readable line in activity views.';


--
-- Name: COLUMN work_sessions.closed_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_sessions.closed_by IS 'How the session ended: explicit (endWorkSession after real work), instant (instantaneous by nature — a single first-party mutation with no span to record), or sweeper (abandoned past the 24h TTL; an hourly job closes sessions still open 24h after they started). NULL while still open. Rows written before migration 113 record instant sessions as explicit and are deliberately not backfilled. A Ralph-reliability signal, not just hygiene: sweeper means the producer died rather than ran to completion.';


--
-- Name: COLUMN work_sessions.started_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_sessions.started_at IS 'When work began. For instant sessions (human mutations) started_at = ended_at.';


--
-- Name: COLUMN work_sessions.ended_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_sessions.ended_at IS 'When the session closed; NULL while open. Set explicitly or by the sweeper.';


--
-- Name: COLUMN work_sessions.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_sessions.created_at IS 'Row creation timestamp.';


--
-- Data for Name: agent_conversation_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.agent_conversation_messages (id, conversation_id, role, content, sort_order, routing_tier, routing_confidence, routing_model, routing_reason, tool_metadata, created_at) FROM stdin;
\.


--
-- Data for Name: agent_conversations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.agent_conversations (id, user_id, title, status, plan_id, project_id, model_provider, model_name, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: agent_token_usage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.agent_token_usage (id, user_id, conversation_id, message_id, provider, model, input_tokens, output_tokens, cached_read_tokens, cached_write_tokens, reasoning_tokens, total_tokens, cost_usd, raw_usage, created_at, source, session_id, request_id, cwd, git_branch) FROM stdin;
\.


--
-- Data for Name: blog_authors; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.blog_authors (id, slug, display_name, bio, avatar_url, user_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: blog_post_tags; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.blog_post_tags (post_id, tag_id) FROM stdin;
\.


--
-- Data for Name: blog_posts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.blog_posts (id, slug, title, excerpt, body_markdown, cover_image_url, cover_image_alt, seo_title, seo_description, status, published_at, author_id, created_at, updated_at, last_edited_by) FROM stdin;
\.


--
-- Data for Name: blog_tags; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.blog_tags (id, slug, name, description, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: code_embeddings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.code_embeddings (id, created_at, workspace_root, path, start_line, end_line, content, content_hash, embedding) FROM stdin;
\.


--
-- Data for Name: code_index_snapshots; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.code_index_snapshots (workspace_root, snapshot, updated_at) FROM stdin;
\.


--
-- Data for Name: custom_prompt_embeddings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.custom_prompt_embeddings (id, created_at, custom_prompt_id, content, embedding, metadata) FROM stdin;
\.


--
-- Data for Name: custom_prompts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.custom_prompts (id, created_at, updated_at, title, content, description, prompt_type, labels, file_path, user_id, project_id, deleted_at) FROM stdin;
\.


--
-- Data for Name: daily_stats; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.daily_stats (id, date, plans_created, plans_completed, plans_updated, tasks_created, tasks_completed, tasks_updated, plans_by_status, tasks_by_status, created_at) FROM stdin;
\.


--
-- Data for Name: documentation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.documentation (id, path, content, repo, sha, pr_number, authors, message, created_at) FROM stdin;
\.


--
-- Data for Name: documentation_embeddings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.documentation_embeddings (id, content, created_at, embedding, metadata, documentation_id) FROM stdin;
\.


--
-- Data for Name: mcp_connector_connections; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mcp_connector_connections (id, connector_key, user_id, enabled, auth_type, credential_prefix, credential_secret_hash, credential_label, connected_at, last_used_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: notes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notes (id, content, author, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.permissions (id, created_at, description, name) FROM stdin;
20d40ded-2872-419c-8c17-4acb7bf32ef5	2026-11-13 19:13:10.001136+00	Read app settings	settings:read
45511a06-52e4-494e-818d-b55ceb158d68	2026-11-13 19:13:10.001136+00	Change app settings	settings:write
dbe10cb4-f362-46dd-92aa-f736e7452ac8	2026-11-13 19:13:10.001136+00	Read user list/details	users:read
82a86a76-6ef9-443c-b5fc-577dc56a266f	2026-11-13 19:13:10.001136+00	Create/update/delete users	users:write
15061779-c53b-4d3f-8b91-fe04d4169c86	2026-11-13 19:13:10.058334+00	Read plans, tasks, notes, semantic search, activity, and output stream	plans:read
819b2c36-eaa1-4075-a2c6-072f327666ae	2026-11-13 19:13:10.058334+00	Create and update plans, tasks, notes, output stream, and commit links	plans:write
281b1bc8-0e8d-40fd-8e47-e56bb7e86b9b	2026-11-13 19:13:10.166025+00	Read feature flags	flags:read
4eab1bb8-f783-4cee-9e06-fef24839aa30	2026-11-13 19:13:10.166025+00	Create/update/delete feature flags	flags:write
35597fb6-3de8-4e8b-a55a-d72a5714ed03	2026-11-13 19:13:10.245699+00	Create, update, publish and archive blog posts, authors and tags	blog:write
cdaa43b5-8834-4f4c-8d99-8a7c293dc2d6	2026-11-13 19:13:10.246804+00	Create and edit DRAFT blog posts and read all blog posts, tags and authors	blog:draft
\.


--
-- Data for Name: plan_embeddings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.plan_embeddings (id, content, created_at, embedding, metadata, plan_id) FROM stdin;
\.


--
-- Data for Name: plan_output_stream; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.plan_output_stream (id, content, created_at, iteration, plan_id, task_id) FROM stdin;
\.


--
-- Data for Name: plan_runs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.plan_runs (id, plan_id, queue_name, bullmq_job_id, run_kind, execution_backend, status, created_at, updated_at, run_config_snapshot, actor_user_id, cancel_requested_at, cancel_requested_by, hostname, pid, worker_id, last_heartbeat_at, branch, model, checkout_id, heartbeat_expected, usage_limit_resets_at, usage_limit_type, resume_of_run_id, scheduled_for) FROM stdin;
\.


--
-- Data for Name: plan_tags; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.plan_tags (id, plan_id, tag, dimension, source, confidence, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: plans; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.plans (id, author, category, created_at, description, title, updated_at, assignee, summary, project, project_id, status, job_run_hooks, run_config, completed_at) FROM stdin;
\.


--
-- Data for Name: project_skills; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.project_skills (id, project_id, slug, tags, disable_model_invocation, source_path, ingested_at, created_at, updated_at, source, source_url, description, orphaned_at) FROM stdin;
\.


--
-- Data for Name: project_tags; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.project_tags (id, project_id, tag, dimension, source, confidence, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.projects (id, created_at, description, name, nx_project_name, updated_at) FROM stdin;
\.


--
-- Data for Name: repositories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.repositories (id, normalized_remote_url, name, default_branch, project_id, created_at, updated_at, ledger_harvest_enabled, ledger_harvest_cursor, ledger_harvested_at) FROM stdin;
\.


--
-- Data for Name: repository_checkouts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.repository_checkouts (id, repository_id, user_id, filesystem_path, display_name, managed, kind, inspection, scanned_at, created_at, updated_at, foreign_skill_injection_enabled) FROM stdin;
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.role_permissions (permission_id, role_id) FROM stdin;
20d40ded-2872-419c-8c17-4acb7bf32ef5	daae94d2-5d4c-4377-8913-546b7d328e6a
45511a06-52e4-494e-818d-b55ceb158d68	daae94d2-5d4c-4377-8913-546b7d328e6a
dbe10cb4-f362-46dd-92aa-f736e7452ac8	daae94d2-5d4c-4377-8913-546b7d328e6a
82a86a76-6ef9-443c-b5fc-577dc56a266f	daae94d2-5d4c-4377-8913-546b7d328e6a
20d40ded-2872-419c-8c17-4acb7bf32ef5	300d46c9-cc8a-460e-afb6-07084a9d77d7
dbe10cb4-f362-46dd-92aa-f736e7452ac8	300d46c9-cc8a-460e-afb6-07084a9d77d7
20d40ded-2872-419c-8c17-4acb7bf32ef5	b54affe0-70fd-4973-bb92-ed0f0d5eba2e
dbe10cb4-f362-46dd-92aa-f736e7452ac8	b54affe0-70fd-4973-bb92-ed0f0d5eba2e
15061779-c53b-4d3f-8b91-fe04d4169c86	2020efa1-7cc8-465a-895c-4686c3557d88
819b2c36-eaa1-4075-a2c6-072f327666ae	2020efa1-7cc8-465a-895c-4686c3557d88
15061779-c53b-4d3f-8b91-fe04d4169c86	19993cf6-d64b-4af4-9293-4cc376f9ef48
819b2c36-eaa1-4075-a2c6-072f327666ae	19993cf6-d64b-4af4-9293-4cc376f9ef48
281b1bc8-0e8d-40fd-8e47-e56bb7e86b9b	daae94d2-5d4c-4377-8913-546b7d328e6a
4eab1bb8-f783-4cee-9e06-fef24839aa30	daae94d2-5d4c-4377-8913-546b7d328e6a
281b1bc8-0e8d-40fd-8e47-e56bb7e86b9b	300d46c9-cc8a-460e-afb6-07084a9d77d7
281b1bc8-0e8d-40fd-8e47-e56bb7e86b9b	b54affe0-70fd-4973-bb92-ed0f0d5eba2e
15061779-c53b-4d3f-8b91-fe04d4169c86	daae94d2-5d4c-4377-8913-546b7d328e6a
819b2c36-eaa1-4075-a2c6-072f327666ae	daae94d2-5d4c-4377-8913-546b7d328e6a
35597fb6-3de8-4e8b-a55a-d72a5714ed03	daae94d2-5d4c-4377-8913-546b7d328e6a
cdaa43b5-8834-4f4c-8d99-8a7c293dc2d6	daae94d2-5d4c-4377-8913-546b7d328e6a
cdaa43b5-8834-4f4c-8d99-8a7c293dc2d6	2020efa1-7cc8-465a-895c-4686c3557d88
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.roles (id, created_at, description, name, updated_at) FROM stdin;
daae94d2-5d4c-4377-8913-546b7d328e6a	2026-11-13 19:13:10.001136+00	Full access (all permissions)	admin	2026-11-13 19:13:10.001136+00
300d46c9-cc8a-460e-afb6-07084a9d77d7	2026-11-13 19:13:10.001136+00	Read access to settings and users	user	2026-11-13 19:13:10.001136+00
b54affe0-70fd-4973-bb92-ed0f0d5eba2e	2026-11-13 19:13:10.001136+00	Read-only (settings and users)	viewer	2026-11-13 19:13:10.001136+00
2020efa1-7cc8-465a-895c-4686c3557d88	2026-11-13 19:13:10.058334+00	OpenThrottle openthrottle-mcp MCP (plans/tasks GraphQL automation)	mcp	2026-11-13 19:13:10.058334+00
19993cf6-d64b-4af4-9293-4cc376f9ef48	2026-11-13 19:13:10.058334+00	BullMQ / workflow-ralph worker GraphQL identity	workflow-ralph	2026-11-13 19:13:10.058334+00
\.


--
-- Data for Name: rollout_flags; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.rollout_flags (id, key, description, enabled, target_roles, created_at, updated_at, kind, variations, off_variation, fallthrough) FROM stdin;
\.


--
-- Data for Name: rule_applications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.rule_applications (id, rule_id, plan_id, task_id, state, details, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: scheduled_agent_job_runs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.scheduled_agent_job_runs (id, scheduled_agent_job_id, bullmq_job_id, status, driver_id, model, trigger, exit_code, error_message, cancel_requested_at, started_at, finished_at, created_at, settings_snapshot, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, reasoning_tokens, total_tokens, cost_usd, raw_usage, repository_checkout_id, resolved_cwd, usage_limit_resets_at, usage_limit_type, resume_of_run_id, scheduled_for) FROM stdin;
\.


--
-- Data for Name: scheduled_agent_jobs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.scheduled_agent_jobs (id, name, prompt, driver_id, model, settings, cron_pattern, timezone, timeout_ms, enabled, scheduler_key, cwd, owner_user_id, last_run_at, next_run_at, created_at, updated_at, repository_checkout_id, misfire_policy, misfire_threshold_ms, schedule_kind, interval_ms, run_at) FROM stdin;
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.schema_migrations (filename, applied_at, checksum) FROM stdin;
001_enable_pgvector.sql	2026-11-13 19:13:09.915073+00	4c499066659732ed08607cddef088a32fbd8246e8a3c1b00ca11acd1178b75fb
002_create_plans_table.sql	2026-11-13 19:13:09.92804+00	cfa78ca21a0117f1f44f2b56a4ad3c875fc9eca5f35bd4fc15578dffed1dd955
003_create_tasks_table.sql	2026-11-13 19:13:09.931779+00	6013c07b4c9169fcab38916cbd223c32268bbb9622b7f88c531a11ffc3d3700c
004_create_plan_embeddings_table.sql	2026-11-13 19:13:09.934892+00	6aa98bbfddf294c4ad4973347fe2c5da53f5379d23dc784397e05c7f324c7e07
005_create_task_embeddings_table.sql	2026-11-13 19:13:09.937627+00	3aa12f655a156479a3378b0432cce4dc2abfcd6f84094e489b1ada7a7046fbc2
006_create_commit_links_table.sql	2026-11-13 19:13:09.939826+00	e5397a53320c986d2a66755a945ee5c9ce9a4ac661888754968cc89cfb0d7770
007_create_plan_output_stream_table.sql	2026-11-13 19:13:09.942543+00	b9b72d0bd5156667044ef7cfd3f9f11a0444027f7d464b028ab8561677f47333
009_create_notes_table.sql	2026-11-13 19:13:09.944865+00	ba36cc998a708ba59e14d98b470e61c25abd1914fcc1f5a21677734073781b31
010_normalize_author_to_visormatt.sql	2026-11-13 19:13:09.947246+00	19325051f9a76fa2923a8e06b03e575f3076f7aaaa0b746c3d58d6696782467b
011_normalize_status_complete_to_completed.sql	2026-11-13 19:13:09.948697+00	9598ad6b50e6cb3da6a14f4f9a7cdad878e9937df91045e3b96dd0de2df55dab
012_add_assignee_to_plans_and_tasks.sql	2026-11-13 19:13:09.954955+00	17dfb596d74059a70bf6e4c46d9cd97a43e2e39fd0beec862c7cd8f40dadc12d
013_normalize_assignee_to_visormatt.sql	2026-11-13 19:13:09.957076+00	5651ad468dbf9110f379ca33e79a4173d93ff41d2ef6151f8628206481f6402b
014_add_summary_to_plans.sql	2026-11-13 19:13:09.958388+00	67a6867e4982f97e98bd672c0374d845f217c5fc9b79a96544092c42e24652ef
015_add_summary_to_tasks.sql	2026-11-13 19:13:09.959609+00	062bfdc6cdfb698bdf7862cd0f15c5de19ea41db6e6efeaeabebf7e4142348aa
016_add_backlog_status.sql	2026-11-13 19:13:09.960828+00	32b7a8127e42095327edcec8d3348cdad53c52e1bb1fcc0d87bcb70e2864107f
017_add_plans_list_sort_indexes.sql	2026-11-13 19:13:09.96214+00	d60a077b9faff30dc2732c406456d472e7fad67c9024c58eb86fe6a4c0d530ef
018_plans_title_trgm.sql	2026-11-13 19:13:09.963745+00	da389d812b0c3b224f44eff3162ef7d65d74c58f708544bdaa010362e0106992
019_create_documentation_table.sql	2026-11-13 19:13:09.967853+00	b1b9543ae7c212abea15fb7a2ec6a8ce7dd54665ae8a80fb805ed3f7513fbd15
020_create_documentation_embeddings_table.sql	2026-11-13 19:13:09.970333+00	c65df93fcfeee8fca5004a1c0fc26b8a893c57b6540576dab28aa618bfe0ea60
021_add_canceled_status.sql	2026-11-13 19:13:09.972636+00	6682d6144cd8043d1ff43205e3a613e56e1b79ce04308f5a862fa7c3280ad80c
022_add_project_to_plans.sql	2026-11-13 19:13:09.973589+00	6dbfd60bb6fe53deb4738a8c2ee7f768d00e45a155901731b70e8f2600ad3f1a
023_add_project_to_tasks.sql	2026-11-13 19:13:09.974765+00	b56c158a66b182e89d2ae27086a336779ab29696760c30e3c8ed7da84e31da54
024_create_projects_table.sql	2026-11-13 19:13:09.975916+00	195aec0f2b1bbf113d8fafc5d7f44065dba3fda5d0a16eff67a3bb997edee93b
025_add_project_id_to_plans_and_tasks.sql	2026-11-13 19:13:09.977904+00	ffb453ad21a509c2ae99333a57def43dc65503051403b11d3058a2eb97186bee
026_create_users_table.sql	2026-11-13 19:13:09.980734+00	e0be4ecb20210429b4288a5860cfb31b63e7246fe4be5d92327ee26caaf930e3
027_create_daily_stats_table.sql	2026-11-13 19:13:09.984362+00	e2478bf52be9b6cb092ceb2c06c87f6e4e15aab54a6f31e42e94fd8ef06e8097
028_plan_task_status_enum.sql	2026-11-13 19:13:09.987746+00	f0fe99f6225ed09efe4e6e5ffc167875800641b0c37f4e053811b8ccb08d522b
029_add_queued_status.sql	2026-11-13 19:13:09.995083+00	5da838abbd87f8f0d6a3d64ba78938607836dd94f39d480f0bd861eff8b1ba70
030_create_doc_ingestion_state_table.sql	2026-11-13 19:13:09.996306+00	426d440c45c4ab551a135d5a57a5cfa2da0819a8e10a312846371993772ddd5b
031_add_users_password_hash_and_email_unique.sql	2026-11-13 19:13:09.9981+00	87b38a4c5924193a2ac05eb291a62c7c9948116a5c77b98fad6eba858bd18dcc
032_projects_unique_nx_project_name.sql	2026-11-13 19:13:09.999118+00	0eb73e28b7a16deb80680bbbbd8242c1861ed91512abb7379b8ba49a7d54b019
033_add_users_disabled_at.sql	2026-11-13 19:13:10.000378+00	0495d7e75193a79d47a11f7f40f53bf93eea2787424b2419b5ab78f42fdf643c
034_create_roles_and_permissions_tables.sql	2026-11-13 19:13:10.001136+00	8f0a6738e18237a93328db5d215179da91d6475b47bcf78daf5879b3df83c179
035_create_subscriptions_table.sql	2026-11-13 19:13:10.007349+00	0edc78e6c79fd97b0b0ef4b0fe2daa5a6af8df0d6a7fbfccdc9bf285615b61ec
036_create_custom_prompts_table.sql	2026-11-13 19:13:10.020537+00	3cf1b160a27eb94d2efeaafeb016899afe41cca64d484ca271602a9a5fcb69bd
037_create_custom_prompt_embeddings_table.sql	2026-11-13 19:13:10.041874+00	f627a545670ffcfcece64ca8a64d3aac92856d819892438767bbe20333530601
038_create_plan_runs_table.sql	2026-11-13 19:13:10.044824+00	896537c248a0aa0dd3f1625d5c5d9599d0c53834f47ec8ebea37c4c3fdb96822
039_comment_on_openthrottle_tables_batch_a.sql	2026-11-13 19:13:10.047245+00	50c3ea0b11ea449e85a4bd0910c75dd72b3e9b54db66828a8285d25d46092a04
040_comment_on_openthrottle_tables_batch_b.sql	2026-11-13 19:13:10.048653+00	79fbe6ec2d3bb54eb2d4d4172b280237bb82d0833d70cb24ae06f416349a07bc
041_comment_on_openthrottle_tables_batch_c.sql	2026-11-13 19:13:10.04969+00	18f90e4ab8059bef88326e034e3140770cc38623d297848ad2e7a6af44c48f18
042_create_workspace_settings_tables.sql	2026-11-13 19:13:10.050451+00	05ccea67b32fc9ea8ad2cb6bba46be633f07a6d5297d97c482ab3f9d90559ca9
043_add_job_run_hooks_to_plans.sql	2026-11-13 19:13:10.053426+00	6f6f9d984b59fc7a8274e32b7267be6c0abbeb9bf8cfe378398817bbeeff1a41
044_create_service_accounts_tables.sql	2026-11-13 19:13:10.054853+00	f4a52193870d6d0e800e136924e6c20a00820abdfabb627156e02a37da7b13d0
045_seed_service_accounts_bootstrap.sql	2026-11-13 19:13:10.058334+00	1730c677fa09e8fe2498ffc7affa661894a9380c4b9073498f18f37206d1619e
046_add_run_config_to_plans.sql	2026-11-13 19:13:10.060489+00	cc579c1e4d84c210fb8a64f245fb6674f3b01242076fe7ca61fdc3f1cb8e3317
047_add_run_config_snapshot_to_plan_runs.sql	2026-11-13 19:13:10.061655+00	f544a9eb8827617e5cb2e65e555af0eceafd88d1a85d259167518cdb0f521628
048_custom_prompts_personas_and_ingest_unique.sql	2026-11-13 19:13:10.062746+00	f51d745b27cdb90609947e5c3ed9fd96706bf58af263f3e0be47c36fcd928ef4
049_add_sort_order_to_tasks.sql	2026-11-13 19:13:10.064001+00	48db7b228c996de57fc88c452d69c5afcd3f648f89308a082baa42675d2f95e8
050_comment_on_openthrottle_tables_batch_a.sql	2026-11-13 19:13:10.067358+00	b72cd6fde0048c15da6acba06ddaad671cc3ef78438fdddae3a746e2833c3db7
051_create_agent_conversations_tables.sql	2026-11-13 19:13:10.068647+00	0930a17d560d7252fa45bf00aa7fdbc8cb0c2723213d8ef9c21d448c4661d3d1
052_create_code_embeddings_table.sql	2026-11-13 19:13:10.0725+00	ae40356000942fea3fa6cdfa1d50470ad921a9b7f52c4c7685b978fd6de49c59
053_add_actor_user_id_to_plan_runs.sql	2026-11-13 19:13:10.074662+00	761b5b1cf8a87a7312304c8b6e7f3e662ba6f2e2502329f85ff0bdcd411f4529
054_create_code_index_snapshots_table.sql	2026-11-13 19:13:10.078291+00	556d27803c2efd502e41480bd27f25c35661dc58cc04ec3391128e888c7a2341
055_add_completed_at_to_plans_and_tasks.sql	2026-11-13 19:13:10.079836+00	614f7f79d71265bc5fab244c6e0b1ffb086db72cb063bb4a6f2caa8c6e5e88d0
056_backfill_completed_at_and_recompute_daily_stats.sql	2026-11-13 19:13:10.081019+00	79f3ead8ba92a36f1a8752ed1dd92f22c291d57c7b9f807c91c89f210ce266a9
057_redate_completed_at_from_plan_output_stream.sql	2026-11-13 19:13:10.082682+00	d5db236b4a5d825b1c61a8371f5bc407c8fd2b1ce19bf2760bf446debac2769a
058_redate_completed_at_from_commit_dates.sql	2026-11-13 19:13:10.084225+00	96ac67d1b80de5e323cde73a7716d2ebe47994295f3c7ab27eb1f0eb0074af66
059_recompute_daily_stats_after_redate.sql	2026-11-13 19:13:10.085782+00	fbaadb2d3b9bb1eadf1d9f666ba632611c74aeb716840537e5a0f57b236947c8
060_create_user_skill_tags.sql	2026-11-13 19:13:10.087163+00	71412cb5b1aa68464656cc11098b405ec8558580e9763760538b42399163a7a2
061_create_project_skills.sql	2026-11-13 19:13:10.089533+00	ed59fc8feed2109cb76b33f5aa0ca88cc3037f70730f719a881b6edc3c333018
062_create_skill_availability_rules.sql	2026-11-13 19:13:10.09192+00	218a690409c2d404dc8177033dd8c3e654e2d3c79904e176273e1429ebbf0a42
063_add_dimension_to_user_skill_tags.sql	2026-11-13 19:13:10.095549+00	b8ff414a7ca68b7be49c83d0741253f84216bd9a484b8a3cddb37bbc99473490
064_create_plan_tags_and_task_tags.sql	2026-11-13 19:13:10.097003+00	a620fc107ea717d989f8b20f108f7d1b9418b92b6fe62c451f3d594db0e69203
065_create_tag_action_rules.sql	2026-11-13 19:13:10.100693+00	af9ac762d33002b96040e710e5b2a959384d79970a7617c4390def73056e5cda
066_create_rule_applications.sql	2026-11-13 19:13:10.103195+00	181fc41b43103f8c0aca45068bba5a98bda58f631ef9789f62cc5ff2ec04d014
067_seed_tagging_service_account.sql	2026-11-13 19:13:10.105673+00	d6d0dd05020b76f321c1c9086f2b9b32f58054af531ad28274960d942389caad
068_create_work_ledger_tables.sql	2026-11-13 19:13:10.107815+00	2f3d233a93b98deac4a8ad2862727cd12de036cfb6cbfd7a0e46687908ae3dc8
069_backfill_work_ledger_from_commit_links.sql	2026-11-13 19:13:10.114709+00	89aa490c598d9f6aba6a09a0d00fd1a7b426555b6c1d928a25868415fc8988d8
070_create_project_tags.sql	2026-11-13 19:13:10.117271+00	84f9479aa73539bd6a45a6ba8c984d4279a66765d5ff70c018e0bdd52573f8c3
071_add_lifecycle_hook_identity_to_tasks.sql	2026-11-13 19:13:10.119603+00	8b378fcbb35f0c928b0effbdd2c106b1e06520e066dba06a4fd7034042d216d9
072_add_title_to_tag_action_rules.sql	2026-11-13 19:13:10.122169+00	0998022efd9c895906bfaebf5ad26e0fa386f5863ebfc9ac57fc55860cd2c3e3
073_seed_node_client_service_account.sql	2026-11-13 19:13:10.12319+00	7592e4fa3e7a51660ae3d4a21e494f2b2d4e2c3b171e88e450a1fc573aefae5d
074_add_source_to_project_skills.sql	2026-11-13 19:13:10.124342+00	d5e58420905cc6a33aa140df22519188d779ffaccd11dd6c90d193174a841983
075_drop_commit_links.sql	2026-11-13 19:13:10.12584+00	6ec5befb083b9d7fe112168437716b5b404164c49b028be1efb25aeb70d4524d
076_add_cancel_marker_and_run_location_to_plan_runs.sql	2026-11-13 19:13:10.128838+00	0aa718342f718926eb87688b67322f0ec2dd21f1fce78ecb0dd39a35445b1d65
077_add_task_id_to_plan_output_stream.sql	2026-11-13 19:13:10.130441+00	99e66731cf93dfeee91f5381bdf0e4993eb0607f7c413de53d4891e093d55087
078_create_repositories_and_checkouts.sql	2026-11-13 19:13:10.136904+00	8bf9f7bccf2185778a8f7e4ccc9c2eb58ae57c82c2709eb0be9470c5d75f7ee2
079_widen_plan_runs_execution_backend_check.sql	2026-11-13 19:13:10.147801+00	e01c60af041314f2c95257f9046717b3dd7ec1e2098207a40e016b40ba9ad7f5
080_add_last_heartbeat_at_to_plan_runs.sql	2026-11-13 19:13:10.149001+00	bc55ddb4a03c77d8cba4ef61b85650c56dc9593af83b9603b7f52cbf9c345b95
081_add_deleted_status_to_agent_conversations.sql	2026-11-13 19:13:10.150024+00	c02002059d17582b1dd6b9730514c159abc9e22638b3c549591ff4c2ae17a8b4
082_create_scheduled_agent_jobs.sql	2026-11-13 19:13:10.150993+00	c32e34ab83b28b6e406f423937d28d31f99815d9dfb293f79ae17ae9b46b5a36
083_create_agent_token_usage.sql	2026-11-13 19:13:10.154595+00	7465b9d3e065554745e1439102c1126aa5df5e8a36962ed124b8ead81afc9e1e
084_create_mcp_connector_connections.sql	2026-11-13 19:13:10.157161+00	45ca55a8ddb61d02a49cfb7b5c98f3ff8bce88c3ef9b4757be0ac5894ba9e2b3
084_create_rollout_flags.sql	2026-11-13 19:13:10.159957+00	e461fb04e23919cd5c391ccee98de0c3c33c4f54625a719ac416c204ce491a6d
084_create_skill_usage_events.sql	2026-11-13 19:13:10.161848+00	bd7439ed4d2aa1427724275622452ff5b79b88e2c92d30bfa7b42c51c014cece
085_create_skill_usage_outcomes.sql	2026-11-13 19:13:10.163881+00	f3c5ebd3bbe1e4bf66337de98459e56f0efcc5f1eb9348063cc2c89b2edbdf22
085_seed_rollout_flag_permissions.sql	2026-11-13 19:13:10.166025+00	44dcbb90c093aef97ac3472093fe45c54f409873f790d9e2afb8eb94679cf009
086_add_source_to_skill_usage_events.sql	2026-11-13 19:13:10.167354+00	c688bde005689dcc69973d828044de895a93b20cac724d7ad2784a28c1532125
087_add_provenance_columns_to_plan_runs.sql	2026-11-13 19:13:10.168571+00	a378e624b487932480a2d91aa406dc5dc79905de0a303588fe48ba395d7eeaed
087_add_run_metadata_to_scheduled_agent_job_runs.sql	2026-11-13 19:13:10.170829+00	e9c3ce86a6c0e606e19617de619aad64d0a089f6d8790d0bcc7973684c67c08d
088_backfill_plan_runs_provenance_from_snapshot.sql	2026-11-13 19:13:10.172102+00	b8324e41b672ade66dfa669b948e24f1efab9aafe8088dbb8b89e28657e86166
089_add_typed_variations_to_rollout_flags.sql	2026-11-13 19:13:10.173325+00	32bc3ecb6139dff1690d02b39d2aedbf6961a73e86b57c7ac6f5d0b90b396dd9
090_add_description_to_project_skills.sql	2026-11-13 19:13:10.175557+00	1a104e97dfe9d09ad4c6abe9abc21e1406a55082937d747c17a9be353aae3fd4
090_add_foreign_skill_injection_enabled_to_repository_checkouts.sql	2026-11-13 19:13:10.17725+00	9d6eba923bb604e6b3a2e03e2d2fb4f4b543aef4ac81e9e2e657bbe79d44ac06
091_create_user_disabled_agent_clis.sql	2026-11-13 19:13:10.178497+00	3def82eeb8d43bbd5c32ee038c8e0d79923e3221b535f71bdf1441735bf6f0d5
092_add_per_model_agent_cli_prefs.sql	2026-11-13 19:13:10.180829+00	d5c5390291b9a7a030a0b2f62b43afcca62954c76286f692c83db72c9dddba07
092_grant_admin_all_permissions.sql	2026-11-13 19:13:10.183993+00	caad6599e5d555fb2d182f6d5abb6e60c68508ee949e1cd85a8a5d3cec86104c
093_add_orphaned_at_to_project_skills.sql	2026-11-13 19:13:10.18516+00	85675dcd50aac7b2eccfe5375a962c59ff08377cb7862c420adc9e5676cf8aec
094_seed_project_skills_tags_from_retired_overlay.sql	2026-11-13 19:13:10.186115+00	32c48805d453d2eda53f6a898319f4c3e60b7620997701333117e4eb61818e39
095_add_no_op_scheduled_agent_job_run_status.sql	2026-11-13 19:13:10.187905+00	4ccab9e79cd4f67123e8abd2fa664f5b24804f5c09611df363340506cc89a6fa
096_add_repository_checkout_targeting_to_scheduled_agent_jobs.sql	2026-11-13 19:13:10.18908+00	7d863338b1aff0f38dfd548f547ebdaff4ab21251ac63d9c1470e2412a3901fc
097_add_worktree_root_to_user_workspace_settings.sql	2026-11-13 19:13:10.190829+00	3334bc28ad5720019108393dc984c83899f7fedc9bfc922e62d165085fad4ce7
098_adopt_plan_run_worktree_verbose_defaults.sql	2026-11-13 19:13:10.191978+00	6ad0ae64f3b5b5b072e8194679250471bf26349c2c20c9377a5b9db1a16d22ec
099_restore_missing_foreign_keys.sql	2026-11-13 19:13:10.1931+00	2ac1b20bcf05ce21066f2f47d3ad47604173a37357edd8955b04bdad646e0799
100_index_unindexed_foreign_keys.sql	2026-11-13 19:13:10.19701+00	f42635a29f7a0ed2dc9a3f7ea84cf71fae08defd03935cafc487076dd1a6513f
101_index_plan_output_stream_created_at.sql	2026-11-13 19:13:10.198658+00	15d658b85a4270a7bf05ed0931e3a8edacd53278960540cc31b8f98ee417d095
102_drop_redundant_indexes.sql	2026-11-13 19:13:10.199688+00	18c04c84dc7c4d904e80f9753188d19d4d1590ef5ca76681cb79bd2190eab493
103_rename_skill_sync_slug_to_ot_skill_sync.sql	2026-11-13 19:13:10.202387+00	1e01a99414a0871161d4349d0b80301e4f2dff26228f69e3fa0b7bfe6fc4204b
104_rename_openthrottle_skill_slugs_to_ot.sql	2026-11-13 19:13:10.205954+00	039c4f6efb5af42eb26fbf69e6cb5a06074a4ae1b1469ee101eb6a7d266bb30c
105_widen_plan_runs_execution_backend_check_gemini.sql	2026-11-13 19:13:10.207925+00	8716550bd4f3a3945935cde26c114d0ee86e5a50318a6bf93ea287e534c115e1
106_widen_plan_runs_execution_backend_check_antigravity.sql	2026-11-13 19:13:10.208989+00	29d6a351261940ad878e2c3e0d83b0009e28b9fb860e642727f131196e12cadb
107_add_service_accounts_acting_user.sql	2026-11-13 19:13:10.210183+00	c139259726f1e48970c14a8ea5a4a96c9e457a2428153e7ae343fe4adc3566f7
108_refresh_worktree_root_comment.sql	2026-11-13 19:13:10.211734+00	9e01af8a6f9250ffcf312f33fe753d311df4bb60c2bb57753a3d97cfc566a825
109_drop_worktree_root_from_user_workspace_settings.sql	2026-11-13 19:13:10.212711+00	0ce7ce91ed8eba3809b4003103b03e88f25fcf608a48b24bdb8153348fe744c1
110_add_heartbeat_expected_to_plan_runs.sql	2026-11-13 19:13:10.213569+00	2dfa99cd809e78c26276f182f77fc2dd1e900b2ced844c5cebb3dd48083a04ce
110_add_user_id_to_skill_usage_events.sql	2026-11-13 19:13:10.214622+00	2b90432a45d0f5e077c3c95db6163ba9aba3c7d77b0ff6664a065c04ad8dc6b0
111_reap_retired_rules_agent_assets.sql	2026-11-13 19:13:10.21623+00	db64e8b9c7607b34316f68c6be36de37da4464896802193bbd3e996c26178bbf
111_refresh_heartbeat_expected_comment.sql	2026-11-13 19:13:10.217308+00	eebdd413867d632db3b7504e6c4c82f24279fa7fac5d401c4e2818c86500d802
112_add_source_to_skill_usage_outcomes.sql	2026-11-13 19:13:10.218169+00	929e156d16dd28450c1ceaa819b191b3a82966984bfb27fa514c01e973c1ed2e
113_add_instant_to_work_sessions_closed_by.sql	2026-11-13 19:13:10.219224+00	d8e1a78a06d3547c7a5e34abc6b9d19efb26da613527afaac631f7f2596766fb
114_widen_skill_usage_scope_personal.sql	2026-11-13 19:13:10.220389+00	b277b923cc2b6ba5e8c302c5e8f65c131f5e520e01f3c40bce799163ccde4e7d
118_dedupe_git_commit_artifacts.sql	2026-11-13 19:13:10.221843+00	85b6d947dae78f9a4fc241c6d1e4446dfb23dc9bdad0f27c387e5ad6b2a0daa5
119_unique_idempotent_artifact_external_key.sql	2026-11-13 19:13:10.223389+00	a6e6cb3ba85c821b2e8947972ecd11d13df29b6b0635f97520ad64cec7567b10
120_demote_false_legacy_git_commit_artifacts.sql	2026-11-13 19:13:10.22487+00	8271ea80b74df49432583bd05621ad59a6562e7f9825f1986f9b3dd34bb96389
121_add_ledger_harvest_to_repositories.sql	2026-11-13 19:13:10.226143+00	679ea0cb9c98ea3c2dea8305a75d59d532879c17a46add01ee57cf167bd03bed
122_seed_work_ledger_harvest_service_account.sql	2026-11-13 19:13:10.227431+00	052458bcaa931d199512d17019bbd4c96bb49880a074f14b8bba60a7f8e32c59
123_widen_skill_usage_outcomes_outcome_check.sql	2026-11-13 19:13:10.228749+00	9ad4db8e66568f4cee6274748ed2480aa78823d59620b0c356023755431670af
124_add_capture_model_to_skill_usage_outcomes.sql	2026-11-13 19:13:10.230211+00	238f8e70bbf2768c5aecfde1b545d9abc673cda32acee56aadce9b6858e1c9c1
125_flag_fixture_rows_in_skill_usage_events.sql	2026-11-13 19:13:10.231605+00	667bf2fcc276b6b647cc22b459ddcfbef8b10b11a920a15039561c118cb7e356
126_settle_never_settled_queued_plan_runs.sql	2026-11-13 19:13:10.232927+00	2beddbc8caa36c4661ac01bd37cb082f099a32c1b9759e2a53eb8ffdda1bc2f7
127_seed_status_change_system_service_account.sql	2026-11-13 19:13:10.234021+00	456c6580d10ca505343dcb66693396bfcf70a9369926092cba21523de0d20da7
128_add_wave_to_tasks.sql	2026-11-13 19:13:10.234898+00	9f157a1b6abf0cbbab4d8973f1a26c3c1c6d09b43c20999d18e4bac70bfee17b
129_strip_design_doc_citations_from_work_ledger_comments.sql	2026-11-13 19:13:10.236099+00	3b6ace424995b8c40c781e81e2db418dca08dbd7e42393bd2126ef979d2c4bd7
130_backfill_legacy_plan_completions_and_mark_orphaned_status_changes.sql	2026-11-13 19:13:10.237177+00	148008d79e138c17ffc40f10cefba2a4ea1e04beb6db0603c9920cd616c5dc19
131_create_blog_tables.sql	2026-11-13 19:13:10.240009+00	1b010006a63af51d8961fc154910f92a732a36f9806e5a6f6ee965515d51c9ee
132_seed_blog_write_permission.sql	2026-11-13 19:13:10.245699+00	6b1bdf61690095eb976e6f27a33e3f886c52dfd347ef586b712ba6527abc48fd
133_seed_blog_draft_permission_and_last_edited_by.sql	2026-11-13 19:13:10.246804+00	c00ace3098c7daaf791776abc08472b8ef50eef12d09a3a9c2467b6f98708ad5
134_skill_usage_events_idempotency.sql	2026-11-13 19:13:10.24791+00	87727e2c8c7634f3f2d621b6d198bebdde7b93198c39b59658709c93e7db9c10
135_agent_token_usage_hook_ingest_columns.sql	2026-11-13 19:13:10.249992+00	4e4398b39e56f0263134732c62ce7b5acfb4bcad842a486a9db3fc6bf84fc890
136_add_promoted_status.sql	2026-11-13 19:13:10.251265+00	5aa13e09dd024eb678254f94ecf01a804a856be59bc5895fff806afd5c7c69c7
137_backfill_promoted_task_status.sql	2026-11-13 19:13:10.252337+00	718d701190c5f9bfba83c6e6fb9788d476ec9a4a6e1edf04aca2e6ca4c3e29b4
138_plan_runs_usage_limit.sql	2026-11-13 19:13:10.253424+00	bfc31722caf7ad2b8e2e282fe3eb304d609fc0e0b9fcafc812a93835a5a1afd2
139_scheduled_agent_job_runs_usage_limit.sql	2026-11-13 19:13:10.255077+00	3a550aff0fcc78d5d5f40425a87761a64f425305c128a62a8014b11b7f1ed0ec
140_plan_runs_scheduled_for.sql	2026-11-13 19:13:10.257093+00	e9495348c501fc9f1194410e348e0e841d539f9e5f12ef8b9e71df6b87c64742
141_scheduled_agent_jobs_misfire_policy.sql	2026-11-13 19:13:10.258137+00	005fe68f7608b07de060a925362755e50905952c7aa9bf7185a23151770a70e2
142_scheduled_agent_jobs_schedule_kind.sql	2026-11-13 19:13:10.259972+00	fab0fbe2c4c1d07a9418c5b00d29652b0c5741f0bf3fc4098ef85ec2280e5578
143_drop_doc_ingestion_state.sql	2026-11-13 19:13:10.261634+00	dfda1e6fc444a52b1c828f79fd5552990082f41b003ad140cb35f637970dd6b0
\.


--
-- Data for Name: service_account_credentials; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.service_account_credentials (id, service_account_id, prefix, secret_hash, label, expires_at, last_used_at, revoked_at, created_at) FROM stdin;
\.


--
-- Data for Name: service_account_roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.service_account_roles (role_id, service_account_id) FROM stdin;
2020efa1-7cc8-465a-895c-4686c3557d88	4697e570-ff16-4f73-8617-ee34870f4975
19993cf6-d64b-4af4-9293-4cc376f9ef48	b3c8a941-bce7-4ee4-b72c-44e5bbba240b
\.


--
-- Data for Name: service_accounts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.service_accounts (id, name, description, disabled_at, created_at, acting_user_id) FROM stdin;
4697e570-ff16-4f73-8617-ee34870f4975	openthrottle-mcp	Cursor MCP (@openthrottle/openthrottle-mcp) — GraphQL plans/tasks automation	\N	2026-11-13 19:13:10.058334+00	\N
b3c8a941-bce7-4ee4-b72c-44e5bbba240b	workflow-ralph	Plans queue / workflow-ralph — GraphQL for Ralph orchestration and task updates	\N	2026-11-13 19:13:10.058334+00	\N
02af3120-0018-4968-9235-f8529bff1a8b	tagging	Tagging jobs (predict on create, refine on link_commit) — plan/task tag writes classified server-llm	\N	2026-11-13 19:13:10.105673+00	\N
fcbcf850-6372-4619-a414-2a471ec6817c	ledger-migration	System identity for the one-time work-ledger backfill from commit_links (migration 069). Credential-less; owns source=legacy artifacts.	\N	2026-11-13 19:13:10.114709+00	\N
798f9a2a-af21-439f-ba0b-ea57859dc5bf	node-client	Direct-Postgres @openthrottle/node-client. Owns work-ledger sessions/artifacts written by createCommitLink (commit_links retirement); credential-less, no GraphQL roles.	\N	2026-11-13 19:13:10.12319+00	\N
4711c443-2fec-462d-ac3a-dd3150dd53da	work-ledger-harvest	Work-ledger trailer harvest — adopts Plan-Id: commits from a repo default branch as source=adapter git_commit artifacts	\N	2026-11-13 19:13:10.227431+00	\N
6be472d5-dc75-4663-8866-a80ef184b060	status-change-system	Server-initiated plan/task status transitions with no request principal (e.g. the stale sweeper, plans.processor)	\N	2026-11-13 19:13:10.234021+00	\N
\.


--
-- Data for Name: skill_availability_rule_sets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.skill_availability_rule_sets (id, project_id, posture, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: skill_availability_rules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.skill_availability_rules (id, rule_set_id, tag_allow, tag_deny, slug_allow, slug_deny, environment, editor, role, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: skill_usage_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.skill_usage_events (id, skill_name, args, session_id, cwd, git_branch, scope, invocation_path, privacy_level, agent_id, agent_type, tool_use_id, prompt_id, hook_event_name, occurred_at, received_at, source, user_id, is_fixture, duplicate_of_id) FROM stdin;
\.


--
-- Data for Name: skill_usage_outcomes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.skill_usage_outcomes (id, skill_name, session_id, tool_use_id, outcome, duration_ms, cwd, git_branch, scope, occurred_at, received_at, source, capture_model) FROM stdin;
\.


--
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.subscriptions (id, created_at, updated_at, user_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, status, current_period_start, current_period_end, cancel_at_period_end) FROM stdin;
\.


--
-- Data for Name: tag_action_rules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tag_action_rules (id, user_id, project_id, tag_all, status, environment, action_type, action_payload, enabled, created_at, updated_at, title) FROM stdin;
\.


--
-- Data for Name: task_embeddings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.task_embeddings (id, content, created_at, embedding, metadata, task_id) FROM stdin;
\.


--
-- Data for Name: task_tags; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.task_tags (id, task_id, tag, dimension, source, confidence, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tasks (id, category, created_at, description, plan_id, requirements, title, updated_at, assignee, summary, project, project_id, status, sort_order, completed_at, parent_task_id, hook_role, hook_scope, hook_source, skill_slug, wave) FROM stdin;
\.


--
-- Data for Name: user_disabled_agent_clis; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_disabled_agent_clis (id, user_id, backend, created_at, model) FROM stdin;
\.


--
-- Data for Name: user_favorite_agent_models; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_favorite_agent_models (id, user_id, backend, model, created_at) FROM stdin;
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_roles (role_id, user_id) FROM stdin;
\.


--
-- Data for Name: user_skill_tags; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_skill_tags (id, user_id, tag, created_at, updated_at, dimension) FROM stdin;
\.


--
-- Data for Name: user_workspace_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_workspace_settings (user_id, contact_display_name, contact_email, enabled_editors, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, created_at, email, github_username, updated_at, password_hash, disabled_at) FROM stdin;
\.


--
-- Data for Name: work_artifacts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.work_artifacts (id, session_id, type, external_key, payload, lifecycle, verification, verified_at, source, message, produced_at, created_at) FROM stdin;
\.


--
-- Data for Name: work_session_subjects; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.work_session_subjects (id, session_id, plan_id, task_id, attached_at) FROM stdin;
\.


--
-- Data for Name: work_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.work_sessions (id, actor_user_id, actor_service_account_id, on_behalf_of_user_id, on_behalf_of_verified, tool_name, tool_version, model, external_ref, plan_run_id, conversation_id, summary, closed_by, started_at, ended_at, created_at) FROM stdin;
\.


--
-- Name: agent_conversation_messages agent_conversation_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_conversation_messages
    ADD CONSTRAINT agent_conversation_messages_pkey PRIMARY KEY (id);


--
-- Name: agent_conversations agent_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_conversations
    ADD CONSTRAINT agent_conversations_pkey PRIMARY KEY (id);


--
-- Name: agent_token_usage agent_token_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_token_usage
    ADD CONSTRAINT agent_token_usage_pkey PRIMARY KEY (id);


--
-- Name: blog_authors blog_authors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_authors
    ADD CONSTRAINT blog_authors_pkey PRIMARY KEY (id);


--
-- Name: blog_post_tags blog_post_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_post_tags
    ADD CONSTRAINT blog_post_tags_pkey PRIMARY KEY (post_id, tag_id);


--
-- Name: blog_posts blog_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_pkey PRIMARY KEY (id);


--
-- Name: blog_tags blog_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_tags
    ADD CONSTRAINT blog_tags_pkey PRIMARY KEY (id);


--
-- Name: code_embeddings code_embeddings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.code_embeddings
    ADD CONSTRAINT code_embeddings_pkey PRIMARY KEY (id);


--
-- Name: code_index_snapshots code_index_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.code_index_snapshots
    ADD CONSTRAINT code_index_snapshots_pkey PRIMARY KEY (workspace_root);


--
-- Name: custom_prompt_embeddings custom_prompt_embeddings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_prompt_embeddings
    ADD CONSTRAINT custom_prompt_embeddings_pkey PRIMARY KEY (id);


--
-- Name: custom_prompts custom_prompts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_prompts
    ADD CONSTRAINT custom_prompts_pkey PRIMARY KEY (id);


--
-- Name: daily_stats daily_stats_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_stats
    ADD CONSTRAINT daily_stats_date_key UNIQUE (date);


--
-- Name: daily_stats daily_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_stats
    ADD CONSTRAINT daily_stats_pkey PRIMARY KEY (id);


--
-- Name: documentation_embeddings documentation_embeddings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentation_embeddings
    ADD CONSTRAINT documentation_embeddings_pkey PRIMARY KEY (id);


--
-- Name: documentation documentation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentation
    ADD CONSTRAINT documentation_pkey PRIMARY KEY (id);


--
-- Name: mcp_connector_connections mcp_connector_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mcp_connector_connections
    ADD CONSTRAINT mcp_connector_connections_pkey PRIMARY KEY (id);


--
-- Name: notes notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: plan_embeddings plan_embeddings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_embeddings
    ADD CONSTRAINT plan_embeddings_pkey PRIMARY KEY (id);


--
-- Name: plan_output_stream plan_output_stream_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_output_stream
    ADD CONSTRAINT plan_output_stream_pkey PRIMARY KEY (id);


--
-- Name: plan_runs plan_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_runs
    ADD CONSTRAINT plan_runs_pkey PRIMARY KEY (id);


--
-- Name: plan_tags plan_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_tags
    ADD CONSTRAINT plan_tags_pkey PRIMARY KEY (id);


--
-- Name: plans plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_pkey PRIMARY KEY (id);


--
-- Name: project_skills project_skills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_skills
    ADD CONSTRAINT project_skills_pkey PRIMARY KEY (id);


--
-- Name: project_tags project_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_tags
    ADD CONSTRAINT project_tags_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: repositories repositories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repositories
    ADD CONSTRAINT repositories_pkey PRIMARY KEY (id);


--
-- Name: repository_checkouts repository_checkouts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repository_checkouts
    ADD CONSTRAINT repository_checkouts_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: rollout_flags rollout_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rollout_flags
    ADD CONSTRAINT rollout_flags_pkey PRIMARY KEY (id);


--
-- Name: rule_applications rule_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rule_applications
    ADD CONSTRAINT rule_applications_pkey PRIMARY KEY (id);


--
-- Name: scheduled_agent_job_runs scheduled_agent_job_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_agent_job_runs
    ADD CONSTRAINT scheduled_agent_job_runs_pkey PRIMARY KEY (id);


--
-- Name: scheduled_agent_jobs scheduled_agent_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_agent_jobs
    ADD CONSTRAINT scheduled_agent_jobs_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (filename);


--
-- Name: service_account_credentials service_account_credentials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_account_credentials
    ADD CONSTRAINT service_account_credentials_pkey PRIMARY KEY (id);


--
-- Name: service_account_roles service_account_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_account_roles
    ADD CONSTRAINT service_account_roles_pkey PRIMARY KEY (service_account_id, role_id);


--
-- Name: service_accounts service_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_accounts
    ADD CONSTRAINT service_accounts_pkey PRIMARY KEY (id);


--
-- Name: skill_availability_rule_sets skill_availability_rule_sets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skill_availability_rule_sets
    ADD CONSTRAINT skill_availability_rule_sets_pkey PRIMARY KEY (id);


--
-- Name: skill_availability_rules skill_availability_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skill_availability_rules
    ADD CONSTRAINT skill_availability_rules_pkey PRIMARY KEY (id);


--
-- Name: skill_usage_events skill_usage_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skill_usage_events
    ADD CONSTRAINT skill_usage_events_pkey PRIMARY KEY (id);


--
-- Name: skill_usage_outcomes skill_usage_outcomes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skill_usage_outcomes
    ADD CONSTRAINT skill_usage_outcomes_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: tag_action_rules tag_action_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tag_action_rules
    ADD CONSTRAINT tag_action_rules_pkey PRIMARY KEY (id);


--
-- Name: task_embeddings task_embeddings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_embeddings
    ADD CONSTRAINT task_embeddings_pkey PRIMARY KEY (id);


--
-- Name: task_tags task_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_tags
    ADD CONSTRAINT task_tags_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: mcp_connector_connections uq_mcp_connector_connections_user_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mcp_connector_connections
    ADD CONSTRAINT uq_mcp_connector_connections_user_key UNIQUE (user_id, connector_key);


--
-- Name: plan_tags uq_plan_tags_plan_tag; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_tags
    ADD CONSTRAINT uq_plan_tags_plan_tag UNIQUE (plan_id, tag);


--
-- Name: project_skills uq_project_skills_project_slug; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_skills
    ADD CONSTRAINT uq_project_skills_project_slug UNIQUE (project_id, slug);


--
-- Name: project_tags uq_project_tags_project_tag; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_tags
    ADD CONSTRAINT uq_project_tags_project_tag UNIQUE (project_id, tag);


--
-- Name: repository_checkouts uq_repository_checkouts_user_path; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repository_checkouts
    ADD CONSTRAINT uq_repository_checkouts_user_path UNIQUE (user_id, filesystem_path);


--
-- Name: rule_applications uq_rule_applications_rule_plan; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rule_applications
    ADD CONSTRAINT uq_rule_applications_rule_plan UNIQUE (rule_id, plan_id);


--
-- Name: scheduled_agent_jobs uq_scheduled_agent_jobs_scheduler_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_agent_jobs
    ADD CONSTRAINT uq_scheduled_agent_jobs_scheduler_key UNIQUE (scheduler_key);


--
-- Name: skill_availability_rule_sets uq_skill_availability_rule_sets_project; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skill_availability_rule_sets
    ADD CONSTRAINT uq_skill_availability_rule_sets_project UNIQUE (project_id);


--
-- Name: task_tags uq_task_tags_task_tag; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_tags
    ADD CONSTRAINT uq_task_tags_task_tag UNIQUE (task_id, tag);


--
-- Name: user_favorite_agent_models uq_user_favorite_agent_models_user_backend_model; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_favorite_agent_models
    ADD CONSTRAINT uq_user_favorite_agent_models_user_backend_model UNIQUE (user_id, backend, model);


--
-- Name: user_skill_tags uq_user_skill_tags_user_tag; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_skill_tags
    ADD CONSTRAINT uq_user_skill_tags_user_tag UNIQUE (user_id, tag);


--
-- Name: work_artifacts uq_work_artifacts_session_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_artifacts
    ADD CONSTRAINT uq_work_artifacts_session_type_key UNIQUE (session_id, type, external_key);


--
-- Name: user_disabled_agent_clis user_disabled_agent_clis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_disabled_agent_clis
    ADD CONSTRAINT user_disabled_agent_clis_pkey PRIMARY KEY (id);


--
-- Name: user_favorite_agent_models user_favorite_agent_models_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_favorite_agent_models
    ADD CONSTRAINT user_favorite_agent_models_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id);


--
-- Name: user_skill_tags user_skill_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_skill_tags
    ADD CONSTRAINT user_skill_tags_pkey PRIMARY KEY (id);


--
-- Name: user_workspace_settings user_workspace_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_workspace_settings
    ADD CONSTRAINT user_workspace_settings_pkey PRIMARY KEY (user_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: work_artifacts work_artifacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_artifacts
    ADD CONSTRAINT work_artifacts_pkey PRIMARY KEY (id);


--
-- Name: work_session_subjects work_session_subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_session_subjects
    ADD CONSTRAINT work_session_subjects_pkey PRIMARY KEY (id);


--
-- Name: work_sessions work_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_sessions
    ADD CONSTRAINT work_sessions_pkey PRIMARY KEY (id);


--
-- Name: idx_agent_conversation_messages_conversation_sort_order; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_agent_conversation_messages_conversation_sort_order ON public.agent_conversation_messages USING btree (conversation_id, sort_order);


--
-- Name: idx_agent_conversations_plan_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_conversations_plan_id ON public.agent_conversations USING btree (plan_id) WHERE (plan_id IS NOT NULL);


--
-- Name: idx_agent_conversations_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_conversations_project_id ON public.agent_conversations USING btree (project_id) WHERE (project_id IS NOT NULL);


--
-- Name: idx_agent_conversations_user_status_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_conversations_user_status_updated_at ON public.agent_conversations USING btree (user_id, status, updated_at DESC);


--
-- Name: idx_agent_token_usage_conversation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_token_usage_conversation_id ON public.agent_token_usage USING btree (conversation_id) WHERE (conversation_id IS NOT NULL);


--
-- Name: idx_agent_token_usage_message_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_token_usage_message_id ON public.agent_token_usage USING btree (message_id) WHERE (message_id IS NOT NULL);


--
-- Name: idx_agent_token_usage_user_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_token_usage_user_created_at ON public.agent_token_usage USING btree (user_id, created_at DESC);


--
-- Name: idx_agent_token_usage_user_provider_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_token_usage_user_provider_created_at ON public.agent_token_usage USING btree (user_id, provider, created_at DESC);


--
-- Name: idx_blog_authors_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_blog_authors_slug ON public.blog_authors USING btree (slug);


--
-- Name: idx_blog_authors_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_blog_authors_user_id ON public.blog_authors USING btree (user_id) WHERE (user_id IS NOT NULL);


--
-- Name: idx_blog_post_tags_tag_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blog_post_tags_tag_id ON public.blog_post_tags USING btree (tag_id);


--
-- Name: idx_blog_posts_author_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blog_posts_author_id ON public.blog_posts USING btree (author_id);


--
-- Name: idx_blog_posts_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blog_posts_published ON public.blog_posts USING btree (published_at DESC, id DESC) WHERE (status = 'PUBLISHED'::text);


--
-- Name: idx_blog_posts_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_blog_posts_slug ON public.blog_posts USING btree (slug);


--
-- Name: idx_blog_tags_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_blog_tags_slug ON public.blog_tags USING btree (slug);


--
-- Name: idx_code_embeddings_vector; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_code_embeddings_vector ON public.code_embeddings USING hnsw (embedding public.vector_cosine_ops);


--
-- Name: idx_code_embeddings_workspace_path; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_code_embeddings_workspace_path ON public.code_embeddings USING btree (workspace_root, path);


--
-- Name: idx_custom_prompt_embeddings_custom_prompt_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_custom_prompt_embeddings_custom_prompt_id ON public.custom_prompt_embeddings USING btree (custom_prompt_id);


--
-- Name: idx_custom_prompt_embeddings_metadata; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_custom_prompt_embeddings_metadata ON public.custom_prompt_embeddings USING gin (metadata);


--
-- Name: idx_custom_prompt_embeddings_vector; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_custom_prompt_embeddings_vector ON public.custom_prompt_embeddings USING hnsw (embedding public.vector_cosine_ops);


--
-- Name: idx_custom_prompts_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_custom_prompts_active ON public.custom_prompts USING btree (created_at DESC) WHERE (deleted_at IS NULL);


--
-- Name: idx_custom_prompts_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_custom_prompts_created_at ON public.custom_prompts USING btree (created_at DESC);


--
-- Name: idx_custom_prompts_file_path_prompt_type; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_custom_prompts_file_path_prompt_type ON public.custom_prompts USING btree (file_path, prompt_type) WHERE (file_path IS NOT NULL);


--
-- Name: idx_custom_prompts_labels; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_custom_prompts_labels ON public.custom_prompts USING gin (labels);


--
-- Name: idx_custom_prompts_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_custom_prompts_project_id ON public.custom_prompts USING btree (project_id) WHERE (project_id IS NOT NULL);


--
-- Name: idx_custom_prompts_title_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_custom_prompts_title_trgm ON public.custom_prompts USING gin (title public.gin_trgm_ops);


--
-- Name: idx_custom_prompts_type_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_custom_prompts_type_created_at ON public.custom_prompts USING btree (prompt_type, created_at DESC);


--
-- Name: idx_custom_prompts_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_custom_prompts_updated_at ON public.custom_prompts USING btree (updated_at DESC);


--
-- Name: idx_custom_prompts_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_custom_prompts_user_id ON public.custom_prompts USING btree (user_id) WHERE (user_id IS NOT NULL);


--
-- Name: idx_documentation_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documentation_created_at ON public.documentation USING btree (created_at DESC);


--
-- Name: idx_documentation_embeddings_documentation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documentation_embeddings_documentation_id ON public.documentation_embeddings USING btree (documentation_id);


--
-- Name: idx_documentation_embeddings_metadata; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documentation_embeddings_metadata ON public.documentation_embeddings USING gin (metadata);


--
-- Name: idx_documentation_embeddings_vector; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documentation_embeddings_vector ON public.documentation_embeddings USING hnsw (embedding public.vector_cosine_ops);


--
-- Name: idx_documentation_path; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documentation_path ON public.documentation USING btree (path);


--
-- Name: idx_documentation_repo_sha_path; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_documentation_repo_sha_path ON public.documentation USING btree (repo, sha, path);


--
-- Name: idx_documentation_sha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documentation_sha ON public.documentation USING btree (sha);


--
-- Name: idx_notes_author; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notes_author ON public.notes USING btree (author);


--
-- Name: idx_notes_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notes_created_at ON public.notes USING btree (created_at DESC);


--
-- Name: idx_permissions_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_permissions_name ON public.permissions USING btree (name);


--
-- Name: idx_plan_embeddings_metadata; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_embeddings_metadata ON public.plan_embeddings USING gin (metadata);


--
-- Name: idx_plan_embeddings_plan_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_embeddings_plan_id ON public.plan_embeddings USING btree (plan_id);


--
-- Name: idx_plan_embeddings_vector; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_embeddings_vector ON public.plan_embeddings USING hnsw (embedding public.vector_cosine_ops);


--
-- Name: idx_plan_output_stream_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_output_stream_created_at ON public.plan_output_stream USING btree (plan_id, created_at);


--
-- Name: idx_plan_output_stream_created_at_desc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_output_stream_created_at_desc ON public.plan_output_stream USING btree (created_at DESC);


--
-- Name: idx_plan_output_stream_task_id_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_output_stream_task_id_created_at ON public.plan_output_stream USING btree (task_id, created_at);


--
-- Name: idx_plan_runs_actor_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_runs_actor_user_id ON public.plan_runs USING btree (actor_user_id);


--
-- Name: idx_plan_runs_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_runs_branch ON public.plan_runs USING btree (branch) WHERE (branch IS NOT NULL);


--
-- Name: idx_plan_runs_checkout_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_runs_checkout_id ON public.plan_runs USING btree (checkout_id) WHERE (checkout_id IS NOT NULL);


--
-- Name: idx_plan_runs_execution_backend; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_runs_execution_backend ON public.plan_runs USING btree (execution_backend);


--
-- Name: idx_plan_runs_inprogress_heartbeat; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_runs_inprogress_heartbeat ON public.plan_runs USING btree (last_heartbeat_at) WHERE (status = 'IN_PROGRESS'::text);


--
-- Name: idx_plan_runs_plan_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_runs_plan_created_at ON public.plan_runs USING btree (plan_id, created_at DESC);


--
-- Name: idx_plans_assignee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plans_assignee ON public.plans USING btree (assignee) WHERE (assignee IS NOT NULL);


--
-- Name: idx_plans_author; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plans_author ON public.plans USING btree (author);


--
-- Name: idx_plans_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plans_category ON public.plans USING btree (category);


--
-- Name: idx_plans_completed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plans_completed_at ON public.plans USING btree (completed_at) WHERE (completed_at IS NOT NULL);


--
-- Name: idx_plans_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plans_created_at ON public.plans USING btree (created_at DESC);


--
-- Name: idx_plans_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plans_project ON public.plans USING btree (project) WHERE (project IS NOT NULL);


--
-- Name: idx_plans_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plans_project_id ON public.plans USING btree (project_id) WHERE (project_id IS NOT NULL);


--
-- Name: idx_plans_status_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plans_status_created_at ON public.plans USING btree (status, created_at DESC);


--
-- Name: idx_plans_status_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plans_status_updated_at ON public.plans USING btree (status, updated_at DESC);


--
-- Name: idx_plans_title_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plans_title_trgm ON public.plans USING gin (title public.gin_trgm_ops);


--
-- Name: idx_plans_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plans_updated_at ON public.plans USING btree (updated_at DESC);


--
-- Name: idx_projects_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_created_at ON public.projects USING btree (created_at DESC);


--
-- Name: idx_projects_nx_project_name_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_projects_nx_project_name_unique ON public.projects USING btree (nx_project_name) WHERE (nx_project_name IS NOT NULL);


--
-- Name: idx_repositories_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_repositories_project_id ON public.repositories USING btree (project_id) WHERE (project_id IS NOT NULL);


--
-- Name: idx_repository_checkouts_repository_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_repository_checkouts_repository_id ON public.repository_checkouts USING btree (repository_id);


--
-- Name: idx_role_permissions_permission_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_role_permissions_permission_id ON public.role_permissions USING btree (permission_id);


--
-- Name: idx_role_permissions_role_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_role_permissions_role_id ON public.role_permissions USING btree (role_id);


--
-- Name: idx_roles_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_roles_name ON public.roles USING btree (name);


--
-- Name: idx_rollout_flags_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_rollout_flags_key ON public.rollout_flags USING btree (key);


--
-- Name: idx_rule_applications_plan_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rule_applications_plan_id ON public.rule_applications USING btree (plan_id);


--
-- Name: idx_rule_applications_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rule_applications_task_id ON public.rule_applications USING btree (task_id);


--
-- Name: idx_scheduled_agent_job_runs_bullmq_job_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_agent_job_runs_bullmq_job_id ON public.scheduled_agent_job_runs USING btree (bullmq_job_id) WHERE (bullmq_job_id IS NOT NULL);


--
-- Name: idx_scheduled_agent_job_runs_job; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_agent_job_runs_job ON public.scheduled_agent_job_runs USING btree (scheduled_agent_job_id, created_at DESC);


--
-- Name: idx_scheduled_agent_job_runs_repository_checkout_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_agent_job_runs_repository_checkout_id ON public.scheduled_agent_job_runs USING btree (repository_checkout_id) WHERE (repository_checkout_id IS NOT NULL);


--
-- Name: idx_scheduled_agent_jobs_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_agent_jobs_enabled ON public.scheduled_agent_jobs USING btree (enabled) WHERE (enabled = true);


--
-- Name: idx_scheduled_agent_jobs_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_agent_jobs_owner ON public.scheduled_agent_jobs USING btree (owner_user_id);


--
-- Name: idx_scheduled_agent_jobs_repository_checkout_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_agent_jobs_repository_checkout_id ON public.scheduled_agent_jobs USING btree (repository_checkout_id) WHERE (repository_checkout_id IS NOT NULL);


--
-- Name: idx_service_account_credentials_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_account_credentials_active ON public.service_account_credentials USING btree (service_account_id) WHERE (revoked_at IS NULL);


--
-- Name: idx_service_account_credentials_prefix; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_service_account_credentials_prefix ON public.service_account_credentials USING btree (prefix);


--
-- Name: idx_service_account_credentials_service_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_account_credentials_service_account_id ON public.service_account_credentials USING btree (service_account_id);


--
-- Name: idx_service_account_roles_role_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_account_roles_role_id ON public.service_account_roles USING btree (role_id);


--
-- Name: idx_service_account_roles_service_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_account_roles_service_account_id ON public.service_account_roles USING btree (service_account_id);


--
-- Name: idx_service_accounts_disabled_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_accounts_disabled_at ON public.service_accounts USING btree (disabled_at) WHERE (disabled_at IS NOT NULL);


--
-- Name: idx_service_accounts_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_service_accounts_name ON public.service_accounts USING btree (name);


--
-- Name: idx_skill_availability_rules_rule_set_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_skill_availability_rules_rule_set_id ON public.skill_availability_rules USING btree (rule_set_id);


--
-- Name: idx_skill_usage_events_is_fixture; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_skill_usage_events_is_fixture ON public.skill_usage_events USING btree (is_fixture);


--
-- Name: idx_skill_usage_events_occurred_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_skill_usage_events_occurred_at ON public.skill_usage_events USING btree (occurred_at DESC);


--
-- Name: idx_skill_usage_events_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_skill_usage_events_scope ON public.skill_usage_events USING btree (scope);


--
-- Name: idx_skill_usage_events_skill_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_skill_usage_events_skill_name ON public.skill_usage_events USING btree (skill_name);


--
-- Name: idx_skill_usage_events_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_skill_usage_events_source ON public.skill_usage_events USING btree (source);


--
-- Name: idx_skill_usage_events_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_skill_usage_events_user_id ON public.skill_usage_events USING btree (user_id);


--
-- Name: idx_skill_usage_outcomes_capture_model; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_skill_usage_outcomes_capture_model ON public.skill_usage_outcomes USING btree (capture_model);


--
-- Name: idx_skill_usage_outcomes_occurred_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_skill_usage_outcomes_occurred_at ON public.skill_usage_outcomes USING btree (occurred_at DESC);


--
-- Name: idx_skill_usage_outcomes_session_skill; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_skill_usage_outcomes_session_skill ON public.skill_usage_outcomes USING btree (session_id, skill_name);


--
-- Name: idx_skill_usage_outcomes_skill_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_skill_usage_outcomes_skill_name ON public.skill_usage_outcomes USING btree (skill_name);


--
-- Name: idx_skill_usage_outcomes_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_skill_usage_outcomes_source ON public.skill_usage_outcomes USING btree (source);


--
-- Name: idx_subscriptions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_status ON public.subscriptions USING btree (status);


--
-- Name: idx_subscriptions_stripe_subscription_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_subscriptions_stripe_subscription_id ON public.subscriptions USING btree (stripe_subscription_id) WHERE (stripe_subscription_id IS NOT NULL);


--
-- Name: idx_subscriptions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions USING btree (user_id);


--
-- Name: idx_tag_action_rules_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tag_action_rules_project_id ON public.tag_action_rules USING btree (project_id);


--
-- Name: idx_tag_action_rules_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tag_action_rules_user_id ON public.tag_action_rules USING btree (user_id);


--
-- Name: idx_task_embeddings_metadata; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_embeddings_metadata ON public.task_embeddings USING gin (metadata);


--
-- Name: idx_task_embeddings_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_embeddings_task_id ON public.task_embeddings USING btree (task_id);


--
-- Name: idx_task_embeddings_vector; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_embeddings_vector ON public.task_embeddings USING hnsw (embedding public.vector_cosine_ops);


--
-- Name: idx_tasks_assignee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_assignee ON public.tasks USING btree (assignee) WHERE (assignee IS NOT NULL);


--
-- Name: idx_tasks_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_category ON public.tasks USING btree (category);


--
-- Name: idx_tasks_completed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_completed_at ON public.tasks USING btree (completed_at) WHERE (completed_at IS NOT NULL);


--
-- Name: idx_tasks_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_created_at ON public.tasks USING btree (created_at DESC);


--
-- Name: idx_tasks_parent_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_parent_task_id ON public.tasks USING btree (parent_task_id);


--
-- Name: idx_tasks_plan_id_sort_order; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_tasks_plan_id_sort_order ON public.tasks USING btree (plan_id, sort_order);


--
-- Name: idx_tasks_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_project ON public.tasks USING btree (project) WHERE (project IS NOT NULL);


--
-- Name: idx_tasks_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_project_id ON public.tasks USING btree (project_id) WHERE (project_id IS NOT NULL);


--
-- Name: idx_tasks_requirements; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_requirements ON public.tasks USING gin (requirements);


--
-- Name: idx_tasks_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_status ON public.tasks USING btree (status);


--
-- Name: idx_user_disabled_agent_clis_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_disabled_agent_clis_user_id ON public.user_disabled_agent_clis USING btree (user_id);


--
-- Name: idx_user_roles_role_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_role_id ON public.user_roles USING btree (role_id);


--
-- Name: idx_user_roles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_user_id ON public.user_roles USING btree (user_id);


--
-- Name: idx_user_workspace_settings_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_workspace_settings_updated_at ON public.user_workspace_settings USING btree (updated_at DESC);


--
-- Name: idx_users_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_created_at ON public.users USING btree (created_at DESC);


--
-- Name: idx_users_email_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_users_email_unique ON public.users USING btree (email) WHERE (email IS NOT NULL);


--
-- Name: idx_users_github_username; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_users_github_username ON public.users USING btree (github_username);


--
-- Name: idx_work_artifacts_type_external_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_artifacts_type_external_key ON public.work_artifacts USING btree (type, external_key);


--
-- Name: idx_work_artifacts_unverified; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_artifacts_unverified ON public.work_artifacts USING btree (produced_at) WHERE (verification = 'unverified'::text);


--
-- Name: idx_work_session_subjects_plan_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_session_subjects_plan_id ON public.work_session_subjects USING btree (plan_id);


--
-- Name: idx_work_session_subjects_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_session_subjects_session_id ON public.work_session_subjects USING btree (session_id);


--
-- Name: idx_work_session_subjects_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_session_subjects_task_id ON public.work_session_subjects USING btree (task_id) WHERE (task_id IS NOT NULL);


--
-- Name: idx_work_sessions_actor_service_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_sessions_actor_service_account_id ON public.work_sessions USING btree (actor_service_account_id) WHERE (actor_service_account_id IS NOT NULL);


--
-- Name: idx_work_sessions_actor_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_sessions_actor_user_id ON public.work_sessions USING btree (actor_user_id) WHERE (actor_user_id IS NOT NULL);


--
-- Name: idx_work_sessions_conversation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_sessions_conversation_id ON public.work_sessions USING btree (conversation_id) WHERE (conversation_id IS NOT NULL);


--
-- Name: idx_work_sessions_on_behalf_of_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_sessions_on_behalf_of_user_id ON public.work_sessions USING btree (on_behalf_of_user_id) WHERE (on_behalf_of_user_id IS NOT NULL);


--
-- Name: idx_work_sessions_open; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_sessions_open ON public.work_sessions USING btree (started_at) WHERE (ended_at IS NULL);


--
-- Name: idx_work_sessions_plan_run_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_sessions_plan_run_id ON public.work_sessions USING btree (plan_run_id) WHERE (plan_run_id IS NOT NULL);


--
-- Name: idx_work_sessions_started_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_sessions_started_at ON public.work_sessions USING btree (started_at DESC);


--
-- Name: plan_runs_queue_job_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX plan_runs_queue_job_unique_idx ON public.plan_runs USING btree (queue_name, bullmq_job_id) WHERE (bullmq_job_id IS NOT NULL);


--
-- Name: plan_runs_resume_of_run_id_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX plan_runs_resume_of_run_id_unique_idx ON public.plan_runs USING btree (resume_of_run_id) WHERE (resume_of_run_id IS NOT NULL);


--
-- Name: plan_runs_scheduled_status_scheduled_for_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX plan_runs_scheduled_status_scheduled_for_idx ON public.plan_runs USING btree (status, scheduled_for) WHERE (status = 'SCHEDULED'::text);


--
-- Name: scheduled_agent_job_runs_resume_of_run_id_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX scheduled_agent_job_runs_resume_of_run_id_unique_idx ON public.scheduled_agent_job_runs USING btree (resume_of_run_id) WHERE (resume_of_run_id IS NOT NULL);


--
-- Name: scheduled_agent_job_runs_schedule_slot_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX scheduled_agent_job_runs_schedule_slot_unique_idx ON public.scheduled_agent_job_runs USING btree (scheduled_agent_job_id, scheduled_for) WHERE ((trigger = 'schedule'::text) AND (scheduled_for IS NOT NULL));


--
-- Name: uq_agent_token_usage_request; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_agent_token_usage_request ON public.agent_token_usage USING btree (source, session_id, request_id) WHERE (request_id IS NOT NULL);


--
-- Name: uq_repositories_normalized_remote_url; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_repositories_normalized_remote_url ON public.repositories USING btree (normalized_remote_url) WHERE (normalized_remote_url IS NOT NULL);


--
-- Name: uq_skill_usage_events_prompt; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_skill_usage_events_prompt ON public.skill_usage_events USING btree (source, session_id, hook_event_name, prompt_id, skill_name) WHERE ((tool_use_id IS NULL) AND (prompt_id IS NOT NULL) AND (duplicate_of_id IS NULL));


--
-- Name: uq_skill_usage_events_tool_use; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_skill_usage_events_tool_use ON public.skill_usage_events USING btree (source, session_id, hook_event_name, tool_use_id) WHERE ((tool_use_id IS NOT NULL) AND (duplicate_of_id IS NULL));


--
-- Name: uq_user_disabled_agent_clis_user_backend_agent; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_user_disabled_agent_clis_user_backend_agent ON public.user_disabled_agent_clis USING btree (user_id, backend) WHERE (model IS NULL);


--
-- Name: uq_user_disabled_agent_clis_user_backend_model; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_user_disabled_agent_clis_user_backend_model ON public.user_disabled_agent_clis USING btree (user_id, backend, model) WHERE (model IS NOT NULL);


--
-- Name: uq_work_artifacts_type_external_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_work_artifacts_type_external_key ON public.work_artifacts USING btree (type, external_key) WHERE (type = ANY (ARRAY['deployment'::text, 'document'::text, 'git_commit'::text, 'plan_promotion'::text, 'pull_request'::text]));


--
-- Name: INDEX uq_work_artifacts_type_external_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.uq_work_artifacts_type_external_key IS 'Global idempotency for artifact types whose external_key is a canonical identity (artifact-type-registry.ts ARTIFACT_IDENTITY.IDEMPOTENT): recording the same commit, PR, document, deployment or promotion twice is a no-op regardless of which session reports it. Deliberately excludes event types such as status_change, whose external_key carries a uuid discriminator so every report is a distinct append-only row. Supersedes uq_work_artifacts_session_type_key for these types; that index remains for the event types.';


--
-- Name: uq_work_session_subjects_session_plan_task; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_work_session_subjects_session_plan_task ON public.work_session_subjects USING btree (session_id, plan_id, COALESCE(task_id, '00000000-0000-0000-0000-000000000000'::uuid));


--
-- Name: agent_conversations update_agent_conversations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_agent_conversations_updated_at BEFORE UPDATE ON public.agent_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: blog_authors update_blog_authors_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_blog_authors_updated_at BEFORE UPDATE ON public.blog_authors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: blog_posts update_blog_posts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: blog_tags update_blog_tags_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_blog_tags_updated_at BEFORE UPDATE ON public.blog_tags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: custom_prompts update_custom_prompts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_custom_prompts_updated_at BEFORE UPDATE ON public.custom_prompts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: mcp_connector_connections update_mcp_connector_connections_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_mcp_connector_connections_updated_at BEFORE UPDATE ON public.mcp_connector_connections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: notes update_notes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: plan_tags update_plan_tags_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_plan_tags_updated_at BEFORE UPDATE ON public.plan_tags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: plans update_plans_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: project_skills update_project_skills_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_project_skills_updated_at BEFORE UPDATE ON public.project_skills FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: project_tags update_project_tags_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_project_tags_updated_at BEFORE UPDATE ON public.project_tags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: projects update_projects_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: repositories update_repositories_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_repositories_updated_at BEFORE UPDATE ON public.repositories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: repository_checkouts update_repository_checkouts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_repository_checkouts_updated_at BEFORE UPDATE ON public.repository_checkouts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: roles update_roles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: rollout_flags update_rollout_flags_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_rollout_flags_updated_at BEFORE UPDATE ON public.rollout_flags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: rule_applications update_rule_applications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_rule_applications_updated_at BEFORE UPDATE ON public.rule_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: scheduled_agent_jobs update_scheduled_agent_jobs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_scheduled_agent_jobs_updated_at BEFORE UPDATE ON public.scheduled_agent_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: skill_availability_rule_sets update_skill_availability_rule_sets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_skill_availability_rule_sets_updated_at BEFORE UPDATE ON public.skill_availability_rule_sets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: skill_availability_rules update_skill_availability_rules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_skill_availability_rules_updated_at BEFORE UPDATE ON public.skill_availability_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: subscriptions update_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tag_action_rules update_tag_action_rules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tag_action_rules_updated_at BEFORE UPDATE ON public.tag_action_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: task_tags update_task_tags_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_task_tags_updated_at BEFORE UPDATE ON public.task_tags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tasks update_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_skill_tags update_user_skill_tags_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_skill_tags_updated_at BEFORE UPDATE ON public.user_skill_tags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_workspace_settings update_user_workspace_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_workspace_settings_updated_at BEFORE UPDATE ON public.user_workspace_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: agent_conversation_messages agent_conversation_messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_conversation_messages
    ADD CONSTRAINT agent_conversation_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.agent_conversations(id) ON DELETE CASCADE;


--
-- Name: agent_conversations agent_conversations_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_conversations
    ADD CONSTRAINT agent_conversations_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE SET NULL;


--
-- Name: agent_conversations agent_conversations_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_conversations
    ADD CONSTRAINT agent_conversations_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: agent_conversations agent_conversations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_conversations
    ADD CONSTRAINT agent_conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: agent_token_usage agent_token_usage_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_token_usage
    ADD CONSTRAINT agent_token_usage_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.agent_conversations(id) ON DELETE SET NULL;


--
-- Name: agent_token_usage agent_token_usage_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_token_usage
    ADD CONSTRAINT agent_token_usage_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.agent_conversation_messages(id) ON DELETE SET NULL;


--
-- Name: agent_token_usage agent_token_usage_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_token_usage
    ADD CONSTRAINT agent_token_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: blog_authors blog_authors_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_authors
    ADD CONSTRAINT blog_authors_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: blog_post_tags blog_post_tags_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_post_tags
    ADD CONSTRAINT blog_post_tags_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.blog_posts(id) ON DELETE CASCADE;


--
-- Name: blog_post_tags blog_post_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_post_tags
    ADD CONSTRAINT blog_post_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.blog_tags(id) ON DELETE CASCADE;


--
-- Name: blog_posts blog_posts_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.blog_authors(id) ON DELETE SET NULL;


--
-- Name: custom_prompt_embeddings custom_prompt_embeddings_custom_prompt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_prompt_embeddings
    ADD CONSTRAINT custom_prompt_embeddings_custom_prompt_id_fkey FOREIGN KEY (custom_prompt_id) REFERENCES public.custom_prompts(id) ON DELETE CASCADE;


--
-- Name: custom_prompts custom_prompts_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_prompts
    ADD CONSTRAINT custom_prompts_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: custom_prompts custom_prompts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_prompts
    ADD CONSTRAINT custom_prompts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: documentation_embeddings documentation_embeddings_documentation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentation_embeddings
    ADD CONSTRAINT documentation_embeddings_documentation_id_fkey FOREIGN KEY (documentation_id) REFERENCES public.documentation(id) ON DELETE CASCADE;


--
-- Name: tasks fk_tasks_parent_task_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT fk_tasks_parent_task_id FOREIGN KEY (parent_task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: mcp_connector_connections mcp_connector_connections_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mcp_connector_connections
    ADD CONSTRAINT mcp_connector_connections_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: plan_embeddings plan_embeddings_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_embeddings
    ADD CONSTRAINT plan_embeddings_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE CASCADE;


--
-- Name: plan_output_stream plan_output_stream_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_output_stream
    ADD CONSTRAINT plan_output_stream_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE CASCADE;


--
-- Name: plan_output_stream plan_output_stream_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_output_stream
    ADD CONSTRAINT plan_output_stream_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;


--
-- Name: plan_runs plan_runs_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_runs
    ADD CONSTRAINT plan_runs_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: plan_runs plan_runs_checkout_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_runs
    ADD CONSTRAINT plan_runs_checkout_id_fkey FOREIGN KEY (checkout_id) REFERENCES public.repository_checkouts(id) ON DELETE SET NULL;


--
-- Name: plan_runs plan_runs_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_runs
    ADD CONSTRAINT plan_runs_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE CASCADE;


--
-- Name: plan_runs plan_runs_resume_of_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_runs
    ADD CONSTRAINT plan_runs_resume_of_run_id_fkey FOREIGN KEY (resume_of_run_id) REFERENCES public.plan_runs(id) ON DELETE SET NULL;


--
-- Name: plan_tags plan_tags_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_tags
    ADD CONSTRAINT plan_tags_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE CASCADE;


--
-- Name: plans plans_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: project_skills project_skills_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_skills
    ADD CONSTRAINT project_skills_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_tags project_tags_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_tags
    ADD CONSTRAINT project_tags_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: repositories repositories_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repositories
    ADD CONSTRAINT repositories_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: repository_checkouts repository_checkouts_repository_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repository_checkouts
    ADD CONSTRAINT repository_checkouts_repository_id_fkey FOREIGN KEY (repository_id) REFERENCES public.repositories(id) ON DELETE CASCADE;


--
-- Name: repository_checkouts repository_checkouts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repository_checkouts
    ADD CONSTRAINT repository_checkouts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: rule_applications rule_applications_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rule_applications
    ADD CONSTRAINT rule_applications_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE CASCADE;


--
-- Name: rule_applications rule_applications_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rule_applications
    ADD CONSTRAINT rule_applications_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.tag_action_rules(id) ON DELETE CASCADE;


--
-- Name: rule_applications rule_applications_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rule_applications
    ADD CONSTRAINT rule_applications_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;


--
-- Name: scheduled_agent_job_runs scheduled_agent_job_runs_repository_checkout_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_agent_job_runs
    ADD CONSTRAINT scheduled_agent_job_runs_repository_checkout_id_fkey FOREIGN KEY (repository_checkout_id) REFERENCES public.repository_checkouts(id) ON DELETE SET NULL;


--
-- Name: scheduled_agent_job_runs scheduled_agent_job_runs_resume_of_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_agent_job_runs
    ADD CONSTRAINT scheduled_agent_job_runs_resume_of_run_id_fkey FOREIGN KEY (resume_of_run_id) REFERENCES public.scheduled_agent_job_runs(id) ON DELETE SET NULL;


--
-- Name: scheduled_agent_job_runs scheduled_agent_job_runs_scheduled_agent_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_agent_job_runs
    ADD CONSTRAINT scheduled_agent_job_runs_scheduled_agent_job_id_fkey FOREIGN KEY (scheduled_agent_job_id) REFERENCES public.scheduled_agent_jobs(id) ON DELETE CASCADE;


--
-- Name: scheduled_agent_jobs scheduled_agent_jobs_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_agent_jobs
    ADD CONSTRAINT scheduled_agent_jobs_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: scheduled_agent_jobs scheduled_agent_jobs_repository_checkout_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_agent_jobs
    ADD CONSTRAINT scheduled_agent_jobs_repository_checkout_id_fkey FOREIGN KEY (repository_checkout_id) REFERENCES public.repository_checkouts(id) ON DELETE SET NULL;


--
-- Name: service_account_credentials service_account_credentials_service_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_account_credentials
    ADD CONSTRAINT service_account_credentials_service_account_id_fkey FOREIGN KEY (service_account_id) REFERENCES public.service_accounts(id) ON DELETE CASCADE;


--
-- Name: service_account_roles service_account_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_account_roles
    ADD CONSTRAINT service_account_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: service_account_roles service_account_roles_service_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_account_roles
    ADD CONSTRAINT service_account_roles_service_account_id_fkey FOREIGN KEY (service_account_id) REFERENCES public.service_accounts(id) ON DELETE CASCADE;


--
-- Name: service_accounts service_accounts_acting_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_accounts
    ADD CONSTRAINT service_accounts_acting_user_id_fkey FOREIGN KEY (acting_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: skill_availability_rule_sets skill_availability_rule_sets_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skill_availability_rule_sets
    ADD CONSTRAINT skill_availability_rule_sets_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: skill_availability_rules skill_availability_rules_rule_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skill_availability_rules
    ADD CONSTRAINT skill_availability_rules_rule_set_id_fkey FOREIGN KEY (rule_set_id) REFERENCES public.skill_availability_rule_sets(id) ON DELETE CASCADE;


--
-- Name: skill_usage_events skill_usage_events_duplicate_of_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skill_usage_events
    ADD CONSTRAINT skill_usage_events_duplicate_of_id_fkey FOREIGN KEY (duplicate_of_id) REFERENCES public.skill_usage_events(id) ON DELETE SET NULL;


--
-- Name: skill_usage_events skill_usage_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skill_usage_events
    ADD CONSTRAINT skill_usage_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: subscriptions subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: tag_action_rules tag_action_rules_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tag_action_rules
    ADD CONSTRAINT tag_action_rules_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: tag_action_rules tag_action_rules_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tag_action_rules
    ADD CONSTRAINT tag_action_rules_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: task_embeddings task_embeddings_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_embeddings
    ADD CONSTRAINT task_embeddings_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_tags task_tags_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_tags
    ADD CONSTRAINT task_tags_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: user_disabled_agent_clis user_disabled_agent_clis_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_disabled_agent_clis
    ADD CONSTRAINT user_disabled_agent_clis_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_favorite_agent_models user_favorite_agent_models_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_favorite_agent_models
    ADD CONSTRAINT user_favorite_agent_models_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_skill_tags user_skill_tags_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_skill_tags
    ADD CONSTRAINT user_skill_tags_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_workspace_settings user_workspace_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_workspace_settings
    ADD CONSTRAINT user_workspace_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: work_artifacts work_artifacts_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_artifacts
    ADD CONSTRAINT work_artifacts_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.work_sessions(id) ON DELETE CASCADE;


--
-- Name: work_session_subjects work_session_subjects_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_session_subjects
    ADD CONSTRAINT work_session_subjects_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE CASCADE;


--
-- Name: work_session_subjects work_session_subjects_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_session_subjects
    ADD CONSTRAINT work_session_subjects_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.work_sessions(id) ON DELETE CASCADE;


--
-- Name: work_session_subjects work_session_subjects_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_session_subjects
    ADD CONSTRAINT work_session_subjects_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: work_sessions work_sessions_actor_service_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_sessions
    ADD CONSTRAINT work_sessions_actor_service_account_id_fkey FOREIGN KEY (actor_service_account_id) REFERENCES public.service_accounts(id);


--
-- Name: work_sessions work_sessions_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_sessions
    ADD CONSTRAINT work_sessions_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.users(id);


--
-- Name: work_sessions work_sessions_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_sessions
    ADD CONSTRAINT work_sessions_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.agent_conversations(id) ON DELETE SET NULL;


--
-- Name: work_sessions work_sessions_on_behalf_of_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_sessions
    ADD CONSTRAINT work_sessions_on_behalf_of_user_id_fkey FOREIGN KEY (on_behalf_of_user_id) REFERENCES public.users(id);


--
-- Name: work_sessions work_sessions_plan_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_sessions
    ADD CONSTRAINT work_sessions_plan_run_id_fkey FOREIGN KEY (plan_run_id) REFERENCES public.plan_runs(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict openthrottleoldschema

