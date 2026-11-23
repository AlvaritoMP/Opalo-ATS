-- Diagnóstico de solo lectura. No crea secuencia, trigger ni tabla.
-- Excluye esquemas internos de Supabase (auth, storage, etc.).

SELECT current_database() AS database_name,
       COALESCE(n.nspname, '(sin coincidencias)') AS schema_name,
       c.relname AS table_name,
       con.conname AS constraint_name,
       pg_get_constraintdef(con.oid) AS definition
  FROM pg_constraint con
  JOIN pg_class c ON c.oid = con.conrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'auth', 'storage', 'realtime', 'extensions', 'vault', 'supabase_functions')
   AND (
        c.relname = 'commercial_quotes'
        OR con.conname = 'commercial_quotes_code_key'
       )

UNION ALL

SELECT current_database(),
       '(sin coincidencias)',
       NULL,
       NULL,
       'Esta base no tiene commercial_quotes ni commercial_quotes_code_key. El 23505 de ese nombre no se genera en este proyecto.'
 WHERE NOT EXISTS (
       SELECT 1
         FROM pg_constraint con
         JOIN pg_class c ON c.oid = con.conrelid
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'auth', 'storage', 'realtime', 'extensions', 'vault', 'supabase_functions')
          AND (
               c.relname = 'commercial_quotes'
               OR con.conname = 'commercial_quotes_code_key'
              )
       );
