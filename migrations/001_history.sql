-- Migration: riwayat chat & kustomisasi agent tersinkron lintas browser
-- Jalankan via: psql $DATABASE_URL -f migration_history.sql
--
-- Dashboard ini pakai SATU password bersama (bukan multi-akun), jadi
-- cukup satu baris per agent_id — tidak perlu kolom user_id.

CREATE TABLE IF NOT EXISTS chat_history (
  agent_id text PRIMARY KEY,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_custom (
  agent_id text PRIMARY KEY,
  name text,
  emoji text,
  description text,
  system_prompt text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
