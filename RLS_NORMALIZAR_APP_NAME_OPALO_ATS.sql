-- =============================================================================

-- ⚠️ DEPRECADO — NO ejecutar en base compartida Opalo ATS + Opalopy

-- =============================================================================

--

-- Este script convertía TODO app_name 'Opalopy' → 'Opalo ATS' y rompería

-- los datos del otro tenant.

--

-- En BD compartida:

--   • Los conteos "sin_app_name" en RLS_VERIFICAR son NORMALES (datos Opalopy).

--   • Ejecutar RLS_MULTIAPP_DEFINITIVO.sql para políticas de ambas apps.

--   • Usar RLS_DIAGNOSTICO_MULTIAPP.sql para ver distribución por tenant.

--

-- Solo si identificaste filas concretas de Opalo ATS mal etiquetadas como Opalopy,

-- usar RLS_REETIQUETAR_OPALO_ATS.sql (con IDs explícitos).

-- =============================================================================



SELECT 'NO EJECUTAR — ver RLS_MULTIAPP_DEFINITIVO.sql y RLS_POLITICA.md' AS aviso;

