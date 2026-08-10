-- ============================================
-- Marca denormalizada: candidato enviado a OpsFlow
-- ============================================
-- Para filtros y badges en tabla de alta densidad.
-- Fuente de verdad del historial: worker_handoff_items / packages.
--
-- Supabase → SQL Editor → ejecutar este script.
-- ============================================

ALTER TABLE public.candidates
ADD COLUMN IF NOT EXISTS opsflow_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS opsflow_last_package_id UUID REFERENCES public.worker_handoff_packages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS opsflow_delivery_status TEXT
    CHECK (opsflow_delivery_status IS NULL OR opsflow_delivery_status IN ('pending', 'delivered', 'failed'));

COMMENT ON COLUMN public.candidates.opsflow_sent_at IS
'Último envío a OpsFlow (presentación). NULL = nunca enviado desde este ATS.';

COMMENT ON COLUMN public.candidates.opsflow_last_package_id IS
'Paquete worker_handoff_packages del último envío a OpsFlow.';

COMMENT ON COLUMN public.candidates.opsflow_delivery_status IS
'pending | delivered | failed — estado de entrega del último envío a OpsFlow.';

CREATE INDEX IF NOT EXISTS idx_candidates_opsflow_sent
ON public.candidates (app_name, opsflow_sent_at DESC)
WHERE opsflow_sent_at IS NOT NULL;

-- Backfill desde historial de handoff (último envío por candidato)
UPDATE public.candidates c
SET
    opsflow_sent_at = sub.sent_at,
    opsflow_last_package_id = sub.package_id,
    opsflow_delivery_status = sub.delivery_status
FROM (
    SELECT DISTINCT ON (i.source_candidate_id)
        i.source_candidate_id AS candidate_id,
        p.id AS package_id,
        p.sent_at,
        COALESCE(NULLIF(p.delivery_status, ''), 'pending') AS delivery_status
    FROM public.worker_handoff_items i
    INNER JOIN public.worker_handoff_packages p ON p.id = i.package_id
    WHERE i.source_candidate_id IS NOT NULL
      AND p.source_app = 'Opalo ATS'
    ORDER BY i.source_candidate_id, p.sent_at DESC NULLS LAST
) sub
WHERE c.id = sub.candidate_id
  AND c.opsflow_sent_at IS NULL;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'candidates'
  AND column_name IN ('opsflow_sent_at', 'opsflow_last_package_id', 'opsflow_delivery_status')
ORDER BY column_name;
