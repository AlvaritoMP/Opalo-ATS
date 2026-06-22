-- Índice para búsquedas por webhook_url (Edge Function tally-webhook)
CREATE INDEX IF NOT EXISTS idx_form_integrations_webhook_url
ON public.form_integrations (webhook_url);
