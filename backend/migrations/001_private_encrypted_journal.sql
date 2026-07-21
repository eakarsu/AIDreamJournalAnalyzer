BEGIN;
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,email TEXT NOT NULL UNIQUE,password TEXT NOT NULL,name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS journal_vaults (
  id UUID PRIMARY KEY, owner_user_id BIGINT NOT NULL UNIQUE, retention_days INTEGER CHECK(retention_days BETWEEN 1 AND 3650),
  export_format TEXT NOT NULL DEFAULT 'json' CHECK(export_format IN ('json','ndjson')), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS private_journal_entries (
  id UUID PRIMARY KEY, vault_id UUID NOT NULL REFERENCES journal_vaults(id) ON DELETE CASCADE,
  owner_user_id BIGINT NOT NULL, client_mutation_id TEXT NOT NULL,
  title_ciphertext BYTEA NOT NULL, title_iv BYTEA NOT NULL, title_auth_tag BYTEA NOT NULL,
  body_ciphertext BYTEA NOT NULL, body_iv BYTEA NOT NULL, body_auth_tag BYTEA NOT NULL,
  reflection_ciphertext BYTEA, reflection_iv BYTEA, reflection_auth_tag BYTEA,
  entry_date DATE NOT NULL, tags TEXT[] NOT NULL DEFAULT '{}', version INTEGER NOT NULL DEFAULT 1,
  deleted_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(vault_id, client_mutation_id)
);
CREATE TABLE IF NOT EXISTS journal_entry_revisions (
  id BIGSERIAL PRIMARY KEY, entry_id UUID NOT NULL, vault_id UUID NOT NULL REFERENCES journal_vaults(id) ON DELETE CASCADE,
  version INTEGER NOT NULL, changed_by BIGINT NOT NULL, change_kind TEXT NOT NULL CHECK(change_kind IN ('created','updated','deleted','exported')),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(entry_id, version, change_kind)
);
CREATE TABLE IF NOT EXISTS journal_delivery_jobs (
  id UUID PRIMARY KEY, vault_id UUID NOT NULL REFERENCES journal_vaults(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, operation TEXT NOT NULL CHECK(operation IN ('reminder','encrypted_backup')),
  idempotency_key TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('queued','succeeded','failed','cancelled')),
  failure_code TEXT, next_attempt_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(vault_id, provider, idempotency_key)
);
CREATE TABLE IF NOT EXISTS journal_audit_events (
  id BIGSERIAL PRIMARY KEY, vault_id UUID NOT NULL REFERENCES journal_vaults(id) ON DELETE CASCADE,
  actor_user_id BIGINT NOT NULL, action TEXT NOT NULL, entry_id UUID, metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_private_journal_owner_date ON private_journal_entries(owner_user_id, entry_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_private_journal_tags ON private_journal_entries USING GIN(tags);
COMMIT;
