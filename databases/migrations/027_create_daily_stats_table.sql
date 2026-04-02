-- Create daily_stats table
-- One row per calendar day (UTC); populated by openthrottle-server DailyStatsProcessor (BullMQ job at 6am UTC).
CREATE TABLE IF NOT EXISTS daily_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    plans_created INTEGER NOT NULL DEFAULT 0,
    plans_completed INTEGER NOT NULL DEFAULT 0,
    plans_updated INTEGER NOT NULL DEFAULT 0,
    tasks_created INTEGER NOT NULL DEFAULT 0,
    tasks_completed INTEGER NOT NULL DEFAULT 0,
    tasks_updated INTEGER NOT NULL DEFAULT 0,
    plans_by_status JSONB NOT NULL DEFAULT '{}'::jsonb,
    tasks_by_status JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats (date DESC);
