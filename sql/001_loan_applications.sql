-- SME LoanFlow｜PostgreSQL schema（SQL 主庫）
-- 文件本體放 Object Storage；此處只存 metadata + 草稿 JSON

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE loan_app_status AS ENUM (
  'DRAFT',
  'IN_PROGRESS',
  'READY_TO_SUBMIT',
  'SUBMITTED',
  'UNDER_ANALYSIS',
  'ADDITIONAL_INFO_REQUIRED',
  'UNDER_REVIEW',
  'SHARED_WITH_LENDER',
  'COMPLETED',
  'WITHDRAWN',
  'EXPIRED'
);

CREATE TYPE document_upload_status AS ENUM (
  'PENDING',
  'UPLOADING',
  'PAUSED',
  'FAILED',
  'UPLOADED',
  'AWAITING_ANALYSIS',
  'ANALYZING',
  'ANALYZED',
  'NEEDS_ATTENTION'
);

CREATE TABLE IF NOT EXISTS loan_applications (
  id                  TEXT PRIMARY KEY,
  company_id          TEXT,
  applicant_user_id   TEXT NOT NULL,
  loan_type           TEXT CHECK (loan_type IN ('secured', 'unsecured')),
  requested_amount    NUMERIC(14, 2),
  purpose             TEXT,
  status              loan_app_status NOT NULL DEFAULT 'DRAFT',
  current_step        INTEGER NOT NULL DEFAULT 0,
  completion_percentage INTEGER NOT NULL DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
  missing_items       JSONB NOT NULL DEFAULT '[]'::jsonb,
  next_step_label     TEXT,
  draft_data_json     JSONB NOT NULL DEFAULT '{}'::jsonb,
  version_number      INTEGER NOT NULL DEFAULT 1,
  last_saved_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at        TIMESTAMPTZ,
  expires_at          TIMESTAMPTZ,
  deleted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loan_apps_user_status
  ON loan_applications (applicant_user_id, status)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS application_sections (
  id              TEXT PRIMARY KEY,
  application_id  TEXT NOT NULL REFERENCES loan_applications(id) ON DELETE CASCADE,
  section_code    TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'incomplete',
  is_complete     BOOLEAN NOT NULL DEFAULT FALSE,
  last_saved_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  validation_errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  UNIQUE (application_id, section_code)
);

CREATE TABLE IF NOT EXISTS application_drafts (
  id              TEXT PRIMARY KEY,
  application_id  TEXT NOT NULL REFERENCES loan_applications(id) ON DELETE CASCADE,
  section_code    TEXT NOT NULL,
  draft_data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  version_number  INTEGER NOT NULL DEFAULT 1,
  saved_by        TEXT NOT NULL,
  saved_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drafts_app_section
  ON application_drafts (application_id, section_code, saved_at DESC);

CREATE TABLE IF NOT EXISTS documents (
  id                TEXT PRIMARY KEY,
  application_id    TEXT NOT NULL REFERENCES loan_applications(id) ON DELETE CASCADE,
  storage_path      TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  doc_kind          TEXT,
  file_size         BIGINT NOT NULL,
  mime_type         TEXT NOT NULL,
  file_hash         TEXT,
  uploaded_by       TEXT NOT NULL,
  upload_status     document_upload_status NOT NULL DEFAULT 'PENDING',
  analysis_status   TEXT,
  analysis_result   JSONB,
  version           INTEGER NOT NULL DEFAULT 1,
  access_policy     TEXT NOT NULL DEFAULT 'owner_only',
  retain_until      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_app ON documents (application_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id              BIGSERIAL PRIMARY KEY,
  actor_user_id   TEXT,
  action          TEXT NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       TEXT NOT NULL,
  detail          JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs (entity_type, entity_id, created_at DESC);
