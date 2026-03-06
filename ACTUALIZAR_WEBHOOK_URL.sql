-- Actualizar la URL del webhook de la integración existente
-- Cambiar de backend de Easypanel a Edge Function de Supabase

-- Ver la integración actual
SELECT 
    id,
    form_name,
    webhook_url
FROM form_integrations 
ORDER BY created_at DESC 
LIMIT 1;

-- Actualizar la URL (reemplaza el ID si es diferente)
UPDATE form_integrations
SET webhook_url = 'https://afhiiplxqtodqxvmswor.supabase.co/functions/v1/tally-webhook/cdcb452f-ca43-482c-90d8-f9eb8d08dcc1'
WHERE id = (
    SELECT id FROM form_integrations 
    ORDER BY created_at DESC 
    LIMIT 1
);

-- Verificar que se actualizó
SELECT 
    id,
    form_name,
    webhook_url
FROM form_integrations 
ORDER BY created_at DESC 
LIMIT 1;
