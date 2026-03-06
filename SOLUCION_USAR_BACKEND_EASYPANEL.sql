-- Volver a usar el backend de Easypanel como intermediario
-- El backend no requiere autenticación y ya procesa los webhooks correctamente

UPDATE form_integrations
SET webhook_url = 'https://opalo-atsopalo-backend.bouasv.easypanel.host/api/webhooks/tally/cdcb452f-ca43-482c-90d8-f9eb8d08dcc1'
WHERE webhook_url LIKE '%supabase.co%';

-- Verificar que se actualizó
SELECT 
    id,
    form_name,
    webhook_url
FROM form_integrations 
ORDER BY created_at DESC 
LIMIT 1;
