-- Migration 002: tabel untuk agent yang dibuat dari UI (bukan hanya override agent bawaan)
-- Jalankan via: psql $DATABASE_URL -f migrations/002_custom_agents.sql
--
-- Bedanya dengan tabel agent_custom (001):
-- - agent_custom: override nama/emoji/system_prompt agent BAWAAN (main, hermes)
-- - custom_agents: agent BARU sepenuhnya yang dibuat pengguna dari UI
--   dengan backend, model, system prompt, dan urutan tampil sendiri

CREATE TABLE IF NOT EXISTS custom_agents (
  id          text PRIMARY KEY,          -- slug unik, mis. 'agent_abc123'
  name        text NOT NULL,
  emoji       text NOT NULL DEFAULT '🤖',
  description text NOT NULL DEFAULT '',
  backend     text NOT NULL DEFAULT 'openclaw', -- 'openclaw' | 'hermes'
  system_prompt text NOT NULL DEFAULT '',
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
