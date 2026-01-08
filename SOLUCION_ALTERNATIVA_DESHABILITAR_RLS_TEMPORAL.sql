-- SOLUCIÓN ALTERNATIVA: Deshabilitar RLS temporalmente para diagnosticar
-- ⚠️ SOLO PARA DIAGNÓSTICO - NO PARA PRODUCCIÓN
-- Ejecuta este script SOLO si quieres probar si RLS es el problema

-- ============================================
-- ADVERTENCIA
-- ============================================
-- Este script deshabilita RLS temporalmente.
-- Esto permitirá acceso a TODOS los datos sin filtros.
-- ÚSALO SOLO PARA DIAGNÓSTICO, NO EN PRODUCCIÓN.

-- ============================================
-- DESHABILITAR RLS TEMPORALMENTE
-- ============================================

ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.processes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_its DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_integrations DISABLE ROW LEVEL SECURITY;

-- ============================================
-- VERIFICAR ESTADO
-- ============================================

SELECT 
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'users', 'processes', 'candidates', 'app_settings',
    'stages', 'document_categories', 'attachments',
    'candidate_history', 'post_its', 'comments',
    'interview_events', 'form_integrations'
)
ORDER BY tablename;

-- ============================================
-- ⚠️ IMPORTANTE: REHABILITAR RLS DESPUÉS
-- ============================================
-- Después de probar, ejecuta REHABILITAR_RLS.sql
-- para volver a habilitar RLS y las políticas

