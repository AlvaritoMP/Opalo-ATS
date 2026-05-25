-- =============================================================================
-- POST-RESTORE — Sincronizar esquema con las apps actuales (Opalo ATS + Opalopy)
-- =============================================================================
--
-- Ejecutar DESPUÉS de restaurar backup y ANTES de probar las apps.
-- Idempotente: usa IF NOT EXISTS / CREATE IF NOT EXISTS en todo.
--
-- ORDEN COMPLETO:
--   1. Este archivo (esquema)
--   2. RLS_MULTIAPP_DEFINITIVO.sql (políticas)
--   3. RLS_VERIFICAR.sql (comprobar)
--   4. Redeploy: supabase functions deploy tally-webhook --no-verify-jwt
-- =============================================================================

-- ---------------------------------------------------------------------------
-- A. Diagnóstico — columnas que la app actual espera
-- ---------------------------------------------------------------------------
SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'bulk_column_values'
        ) THEN '✅ bulk_column_values'
        ELSE '❌ FALTA bulk_column_values'
    END AS candidates_bulk_column_values,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'processes' AND column_name = 'is_bulk_process'
        ) THEN '✅ is_bulk_process'
        ELSE '❌ FALTA is_bulk_process'
    END AS processes_is_bulk,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'processes' AND column_name = 'bulk_config'
        ) THEN '✅ bulk_config'
        ELSE '❌ FALTA bulk_config'
    END AS processes_bulk_config,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'form_integrations' AND column_name = 'field_mapping'
        ) THEN '✅ field_mapping'
        ELSE '❌ FALTA field_mapping'
    END AS form_integrations_field_mapping,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'bulk_process_activity_log'
        ) THEN '✅ bulk_process_activity_log'
        ELSE '❌ FALTA tabla bulk_process_activity_log'
    END AS activity_log_table;

-- ---------------------------------------------------------------------------
-- B. Procesos masivos (processes)
-- ---------------------------------------------------------------------------
ALTER TABLE processes
ADD COLUMN IF NOT EXISTS is_bulk_process BOOLEAN DEFAULT false;

ALTER TABLE processes
ADD COLUMN IF NOT EXISTS bulk_config JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_processes_is_bulk_process
ON processes(is_bulk_process) WHERE is_bulk_process = true;

CREATE INDEX IF NOT EXISTS idx_processes_bulk_config
ON processes USING GIN (bulk_config) WHERE is_bulk_process = true;

-- ---------------------------------------------------------------------------
-- C. Tabla alta densidad — valores por celda (candidates)
-- ---------------------------------------------------------------------------
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS bulk_column_values JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_candidates_bulk_column_values
ON candidates USING GIN (bulk_column_values)
WHERE bulk_column_values IS NOT NULL AND bulk_column_values <> '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- D. Campos IA, ubicación, WhatsApp, psicolaboral (candidates)
-- ---------------------------------------------------------------------------
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS metadata_ia TEXT,
ADD COLUMN IF NOT EXISTS score_ia NUMERIC(5, 2),
ADD COLUMN IF NOT EXISTS province TEXT,
ADD COLUMN IF NOT EXISTS district TEXT,
ADD COLUMN IF NOT EXISTS last_whatsapp_interaction_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS psycholaboral_evaluation JSONB DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_candidates_score_ia
ON candidates(score_ia DESC) WHERE score_ia IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_candidates_psycholaboral_evaluation
ON candidates USING GIN (psycholaboral_evaluation)
WHERE psycholaboral_evaluation IS NOT NULL;

-- ---------------------------------------------------------------------------
-- E. Integraciones Tally (form_integrations)
-- ---------------------------------------------------------------------------
ALTER TABLE form_integrations
ADD COLUMN IF NOT EXISTS field_mapping JSONB;

-- ---------------------------------------------------------------------------
-- F. Psicolaboral global (app_settings)
-- ---------------------------------------------------------------------------
ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS psycholaboral_inventory JSONB DEFAULT NULL;

-- ---------------------------------------------------------------------------
-- G. Registro de actividad en procesos masivos
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bulk_process_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_id UUID NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
    candidate_id UUID REFERENCES candidates(id) ON DELETE SET NULL,
    candidate_name TEXT,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_name TEXT,
    action_type TEXT NOT NULL,
    field_name TEXT,
    old_value TEXT,
    new_value TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    app_name TEXT NOT NULL DEFAULT 'Opalo ATS'
);

CREATE INDEX IF NOT EXISTS idx_bulk_activity_process_created
ON bulk_process_activity_log (process_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bulk_activity_app_name
ON bulk_process_activity_log (app_name);

ALTER TABLE bulk_process_activity_log ENABLE ROW LEVEL SECURITY;

-- Las políticas concretas se crean en RLS_MULTIAPP_DEFINITIVO.sql (paso 2)

-- ---------------------------------------------------------------------------
-- H. Verificación final de esquema
-- ---------------------------------------------------------------------------
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'candidates'
  AND column_name IN (
    'bulk_column_values', 'score_ia', 'metadata_ia',
    'province', 'district', 'psycholaboral_evaluation'
  )
ORDER BY column_name;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'processes'
  AND column_name IN ('is_bulk_process', 'bulk_config')
ORDER BY column_name;

-- ---------------------------------------------------------------------------
-- I. Tenants (debe seguir mostrando Opalo ATS + Opalopy tras el restore)
-- ---------------------------------------------------------------------------
SELECT COALESCE(app_name, '(NULL)') AS app_name, COUNT(*) AS candidatos
FROM public.candidates
GROUP BY 1
ORDER BY 2 DESC;
