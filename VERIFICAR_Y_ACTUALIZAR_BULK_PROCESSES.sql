-- ============================================
-- Script para verificar y actualizar usuarios
-- para que vean la sección "Procesos Masivos"
-- ============================================

-- 1. Verificar usuarios y sus secciones visibles
SELECT 
    id,
    name,
    email,
    role,
    visible_sections,
    CASE 
        WHEN visible_sections IS NULL THEN 'Usa secciones por defecto del rol'
        WHEN 'bulk-processes' = ANY(visible_sections::text[]) THEN '✅ Ya tiene bulk-processes'
        ELSE '❌ No tiene bulk-processes'
    END as estado_bulk_processes
FROM users
WHERE role IN ('admin', 'recruiter')
ORDER BY role, name;

-- 2. Si un usuario tiene secciones personalizadas pero no incluye 'bulk-processes',
-- puedes agregarlo ejecutando esto (reemplaza USER_ID con el ID del usuario):
/*
UPDATE users
SET visible_sections = array_append(visible_sections, 'bulk-processes')
WHERE id = 'USER_ID' 
  AND role IN ('admin', 'recruiter')
  AND visible_sections IS NOT NULL
  AND NOT ('bulk-processes' = ANY(visible_sections::text[]));
*/

-- 3. Para usuarios admin/recruiter que NO tienen secciones personalizadas,
-- la sección debería aparecer automáticamente según el código.
-- Si no aparece, puede ser un problema de caché del navegador.

-- 4. Para forzar que TODOS los admin/recruiter vean la sección
-- (incluso si tienen secciones personalizadas sin 'bulk-processes'):
/*
UPDATE users
SET visible_sections = array_append(COALESCE(visible_sections, ARRAY[]::text[]), 'bulk-processes')
WHERE role IN ('admin', 'recruiter')
  AND NOT ('bulk-processes' = ANY(COALESCE(visible_sections, ARRAY[]::text[])::text[]));
*/
