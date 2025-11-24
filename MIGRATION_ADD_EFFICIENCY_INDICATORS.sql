-- Migración: Agregar columnas para indicadores de eficiencia
-- Ejecutar en Supabase SQL Editor

-- Agregar columnas a la tabla processes
ALTER TABLE processes 
ADD COLUMN IF NOT EXISTS published_date DATE,
ADD COLUMN IF NOT EXISTS need_identified_date DATE;

COMMENT ON COLUMN processes.published_date IS 'Fecha de publicación de la oferta (para calcular Time to Hire)';
COMMENT ON COLUMN processes.need_identified_date IS 'Fecha de identificación de necesidad (para calcular Time to Fill)';

-- Agregar columnas a la tabla candidates
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS offer_accepted_date DATE,
ADD COLUMN IF NOT EXISTS application_started_date DATE,
ADD COLUMN IF NOT EXISTS application_completed_date DATE;

COMMENT ON COLUMN candidates.offer_accepted_date IS 'Fecha de aceptación de oferta (para calcular Time to Hire)';
COMMENT ON COLUMN candidates.application_started_date IS 'Fecha de inicio de solicitud (para calcular Application Completion Rate)';
COMMENT ON COLUMN candidates.application_completed_date IS 'Fecha de finalización de solicitud (para calcular Application Completion Rate)';

