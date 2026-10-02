-- Configuración de alertas: clientes y procesos con avisos apagados.
ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS user_alert_settings JSONB;

COMMENT ON COLUMN app_settings.user_alert_settings IS
'Listas de clientes (disabledClientIds) y procesos (disabledProcessIds) para los que no se generan avisos de seguimiento.';
