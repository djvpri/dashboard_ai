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

-- Tabel agent kustom (dibuat dari UI, disimpan permanen di DB)
-- Ditambahkan setelah tabel chat_history & agent_custom sudah ada.
CREATE TABLE IF NOT EXISTS custom_agents (
  id text PRIMARY KEY,
  name text NOT NULL,
  emoji text NOT NULL DEFAULT '🤖',
  description text NOT NULL DEFAULT '',
  backend text NOT NULL DEFAULT 'openclaw',   -- 'openclaw' | 'hermes'
  system_prompt text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tambah kolom quick_prompts ke agent_custom (template chat per agent)
ALTER TABLE agent_custom ADD COLUMN IF NOT EXISTS quick_prompts jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Tambah kolom quick_prompts ke custom_agents (agent kustom dari UI)
ALTER TABLE custom_agents ADD COLUMN IF NOT EXISTS quick_prompts jsonb NOT NULL DEFAULT '[]'::jsonb;
