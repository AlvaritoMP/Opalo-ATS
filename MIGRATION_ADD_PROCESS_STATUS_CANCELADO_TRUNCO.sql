-- MIGRACIÓN: Estados cancelado y trunco para procesos
-- Los valores se almacenan en processes.status (TEXT, sin CHECK en BD).
-- Valores válidos en la app: en_proceso, standby, terminado, cancelado, trunco

COMMENT ON COLUMN processes.status IS
'Estado del proceso: en_proceso (activo), standby, terminado (con contratados), cancelado (sin facturación), trunco (facturación parcial). Solo en_proceso genera alertas.';
