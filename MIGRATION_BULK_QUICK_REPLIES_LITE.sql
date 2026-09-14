-- Respuestas rápidas de procesos En Proceso y Stand By, sin adjuntos en base64.
-- Opcional: el ATS funciona sin esto, pero TODAS carga mucho más rápido si lo ejecutas.
-- SQL Editor de Supabase → Run.

CREATE OR REPLACE FUNCTION public.get_operational_bulk_quick_replies(p_app_name text)
RETURNS TABLE(id uuid, title text, quick_replies jsonb)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    p.id,
    p.title,
    COALESCE((
      SELECT jsonb_agg(
        jsonb_strip_nulls(
          jsonb_build_object(
            'id', elem->>'id',
            'title', elem->>'title',
            'content', elem->>'content',
            'color', elem->>'color',
            'attachments', (
              SELECT COALESCE(jsonb_agg(
                jsonb_strip_nulls(
                  jsonb_build_object(
                    'id', att->>'id',
                    'type', att->>'type',
                    'fileName', att->>'fileName',
                    'mimeType', att->>'mimeType',
                    'url', CASE
                      WHEN COALESCE(att->>'url', '') LIKE 'data:%' THEN NULL
                      ELSE NULLIF(att->>'url', '')
                    END
                  )
                )
              ), '[]'::jsonb)
              FROM jsonb_array_elements(COALESCE(elem->'attachments', '[]'::jsonb)) att
            )
          )
        )
      )
      FROM jsonb_array_elements(COALESCE(p.bulk_config->'quickReplies', '[]'::jsonb)) elem
    ), '[]'::jsonb)
  FROM public.processes p
  WHERE p.app_name = p_app_name
    AND p.is_bulk_process IS TRUE
    AND COALESCE(p.status, 'en_proceso') IN ('en_proceso', 'standby');
$$;

GRANT EXECUTE ON FUNCTION public.get_operational_bulk_quick_replies(text) TO anon, authenticated, service_role;
