CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- Auditoria y trazabilidad de generacion de PDFs QR
-- Proyecto: Sistema de Permisos QR
-- Base de datos: PostgreSQL
-- =========================================================

-- 1) Lotes de generacion masiva
CREATE TABLE IF NOT EXISTS pdf_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  template_name TEXT,
  template_hash TEXT,
  csv_name TEXT,
  total_rows INT NOT NULL DEFAULT 0,
  generated_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  error_message TEXT,
  requested_by TEXT,
  notes TEXT
);

-- 2) Documentos PDF generados individualmente
CREATE TABLE IF NOT EXISTS pdf_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES pdf_batches(id) ON DELETE CASCADE,

  uuid_publico UUID NOT NULL DEFAULT gen_random_uuid(),
  hash_publico TEXT NOT NULL,

  placa TEXT,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  qr_payload TEXT,

  status TEXT NOT NULL DEFAULT 'generated'
    CHECK (status IN ('generated', 'validated', 'downloaded', 'failed')),

  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  page_width NUMERIC(10,2),
  page_height NUMERIC(10,2),
  qr_x NUMERIC(10,2),
  qr_y NUMERIC(10,2),
  qr_width NUMERIC(10,2),
  qr_height NUMERIC(10,2),

  download_count INT NOT NULL DEFAULT 0,
  last_download_at TIMESTAMPTZ,

  UNIQUE (uuid_publico),
  UNIQUE (hash_publico)
);

-- 3) Eventos de auditoria
CREATE TABLE IF NOT EXISTS pdf_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES pdf_documents(id) ON DELETE CASCADE,

  event_type TEXT NOT NULL
    CHECK (event_type IN ('generated', 'validated', 'viewed', 'downloaded', 'failed')),

  event_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  result TEXT,
  details JSONB
);

-- Indices utiles
CREATE INDEX IF NOT EXISTS idx_pdf_batches_created_at ON pdf_batches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pdf_documents_batch_id ON pdf_documents(batch_id);
CREATE INDEX IF NOT EXISTS idx_pdf_documents_generated_at ON pdf_documents(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_pdf_audit_events_document_id ON pdf_audit_events(document_id);
CREATE INDEX IF NOT EXISTS idx_pdf_audit_events_event_at ON pdf_audit_events(event_at DESC);
CREATE INDEX IF NOT EXISTS idx_pdf_audit_events_event_type ON pdf_audit_events(event_type);

-- Consulta rapida de auditoria por lote:
-- SELECT b.id, b.created_at, b.status, b.total_rows, b.generated_count, b.failed_count
-- FROM pdf_batches b
-- ORDER BY b.created_at DESC;
