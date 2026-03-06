-- Actualizar la URL del webhook de la integración existente
-- Cambiar de backend de Easypanel a Edge Function de Supabase
-- IMPORTANTE: La URL debe incluir el ID del webhook al final

-- Ver la integración actual
SELECT 
    id,
    form_name,
    webhook_url
FROM form_integrations 
ORDER BY created_at DESC 
LIMIT 1;

-- Actualizar la URL a Edge Function
-- Reemplaza cdcb452f-ca43-482c-90d8-f9eb8d08dcc1 con el ID real de tu webhook
UPDATE form_integrations
SET webhook_url = 'https://afhiiplxqtodqxvmswor.supabase.co/functions/v1/tally-webhook/cdcb452f-ca43-482c-90d8-f9eb8d08dcc1'
WHERE webhook_url LIKE '%opalo-atsopalo-backend%';

-- Verificar que se actualizó correctamente
SELECT 
    id,
    form_name,
    webhook_url
FROM form_integrations 
ORDER BY created_at DESC 
LIMIT 1;
