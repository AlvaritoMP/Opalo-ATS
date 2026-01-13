-- Verificar políticas RLS en processes (ejecuta solo esta query)
SELECT 
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'processes'
ORDER BY policyname;
