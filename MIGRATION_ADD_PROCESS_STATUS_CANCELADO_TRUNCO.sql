-- MIGRACIÓN: Estados cancelado y trunco para procesos
-- Ejecutar en Supabase SQL Editor
--
-- La tabla processes tiene un CHECK (processes_status_check) que solo
-- permitía en_proceso, standby y terminado. Hay que ampliarlo.

ALTER TABLE processes
DROP CONSTRAINT IF EXISTS processes_status_check;

ALTER TABLE processes
ADD CONSTRAINT processes_status_check
CHECK (status IN ('en_proceso', 'standby', 'terminado', 'cancelado', 'trunco'));

COMMENT ON COLUMN processes.status IS
'Estado del proceso: en_proceso (activo), standby, terminado (con contratados), cancelado (sin facturación), trunco (facturación parcial). Solo en_proceso genera alertas.';
