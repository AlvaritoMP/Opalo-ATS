import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { applyImportTextCaseToCandidate } from '../../../../lib/importTextCase.js';
import { buildTallyCandidateFromSubmission } from '../../../../lib/tallyWebhookMapping.js';

console.log('🔵 Cargando módulo webhooks.js...');

const router = express.Router();

console.log('🔵 Router de webhooks creado');

// Endpoint de prueba simple
router.get('/test', (req, res) => {
    console.log('🔴 GET /api/webhooks/test llamado');
    res.json({ message: 'Webhook router funciona', timestamp: new Date().toISOString() });
});

router.post('/test', (req, res) => {
    console.log('🔴 POST /api/webhooks/test llamado');
    console.log('🔴 Body:', req.body);
    res.json({ message: 'Webhook router POST funciona', body: req.body, timestamp: new Date().toISOString() });
});

// Inicializar cliente de Supabase con service key para bypass RLS
console.log('🔵 Inicializando cliente Supabase...');
console.log('🔵 SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Configurado' : '❌ NO configurado');
console.log('🔵 SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✅ Configurado' : '❌ NO configurado');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

console.log('🔵 Cliente Supabase inicializado');

// Endpoint para recibir webhooks de Tally
router.post('/tally/:webhookId', async (req, res) => {
    // FORZAR LOG INMEDIATO - VERIFICAR QUE SE EJECUTA
    console.log('🔴 ==========================================');
    console.log('🔴 WEBHOOK ENDPOINT LLAMADO');
    console.log('🔴 Timestamp:', new Date().toISOString());
    console.log('🔴 Params:', req.params);
    console.log('🔴 Body keys:', Object.keys(req.body || {}));
    console.log('🔴 ==========================================');
    
    try {
        const { webhookId } = req.params;
        const tallyData = req.body;

        console.log(`📥 Webhook recibido de Tally - ID: ${webhookId}`);
        console.log('📋 Datos recibidos:', JSON.stringify(tallyData, null, 2));

        // Construir la URL completa del webhook
        // Normalizar a https siempre (en producción siempre es https)
        const host = req.get('host');
        const path = req.originalUrl;
        const webhookUrlHttp = `http://${host}${path}`;
        const webhookUrlHttps = `https://${host}${path}`;
        
        console.log(`🔍 Buscando integración con webhook_url (http): ${webhookUrlHttp}`);
        console.log(`🔍 Buscando integración con webhook_url (https): ${webhookUrlHttps}`);

        // 1. Buscar la integración por webhook URL (probar ambas versiones)
        let integration = null;
        let integrationError = null;
        
        // Primero intentar con https (más común en producción)
        let result = await supabase
            .from('form_integrations')
            .select('*')
            .eq('webhook_url', webhookUrlHttps)
            .maybeSingle();
        
        if (result.error) {
            integrationError = result.error;
        } else if (result.data) {
            integration = result.data;
        } else {
            // Si no se encuentra con https, intentar con http
            result = await supabase
                .from('form_integrations')
                .select('*')
                .eq('webhook_url', webhookUrlHttp)
                .maybeSingle();
            
            if (result.error) {
                integrationError = result.error;
            } else {
                integration = result.data;
            }
        }

        if (integrationError) {
            console.error('❌ Error buscando integración:', integrationError);
            return res.status(500).json({ 
                error: 'Error buscando integración',
                details: integrationError.message 
            });
        }

        if (!integration) {
            console.error(`❌ Integración no encontrada para webhook: ${webhookUrl}`);
            return res.status(404).json({ 
                error: 'Integration not found',
                webhookUrl 
            });
        }

        console.log(`✅ Integración encontrada: ${integration.form_name} (${integration.id})`);

        // 2. Obtener el proceso asociado
        const { data: process, error: processError } = await supabase
            .from('processes')
            .select('id, is_bulk_process, bulk_config')
            .eq('id', integration.process_id)
            .eq('app_name', integration.app_name)
            .maybeSingle();

        if (processError) {
            console.error('❌ Error buscando proceso:', processError);
            return res.status(500).json({ 
                error: 'Error buscando proceso',
                details: processError.message 
            });
        }

        if (!process) {
            console.error(`❌ Proceso no encontrado: ${integration.process_id}`);
            return res.status(404).json({ 
                error: 'Process not found',
                processId: integration.process_id 
            });
        }

        // 3. Obtener las etapas del proceso desde la tabla stages
        const { data: stages, error: stagesError } = await supabase
            .from('stages')
            .select('id, name, order_index')
            .eq('process_id', integration.process_id)
            .eq('app_name', integration.app_name)
            .order('order_index', { ascending: true });

        if (stagesError) {
            console.error('❌ Error buscando etapas:', stagesError);
            return res.status(500).json({ 
                error: 'Error buscando etapas',
                details: stagesError.message 
            });
        }

        if (!stages || stages.length === 0) {
            console.error(`❌ Proceso no tiene etapas: ${integration.process_id}`);
            return res.status(400).json({ 
                error: 'Process has no stages',
                processId: integration.process_id 
            });
        }

        console.log(`✅ Proceso encontrado con ${stages.length} etapas`);

        // 4. Mapear campos de Tally a candidato
        const candidateData = buildTallyCandidateFromSubmission(tallyData, integration, process);
        applyImportTextCaseToCandidate(candidateData);
        candidateData.process_id = integration.process_id;
        candidateData.stage_id = stages[0].id;
        candidateData.app_name = integration.app_name;

        console.log('👤 Datos del candidato mapeados:', JSON.stringify(candidateData, null, 2));

        // Validar que al menos tenga nombre o email
        if (!candidateData.name && !candidateData.email) {
            console.error('❌ Candidato sin nombre ni email');
            return res.status(400).json({ 
                error: 'Candidate must have at least name or email',
                candidateData 
            });
        }

        const bulkColumnValues = candidateData.bulk_column_values;
        const insertPayload = { ...candidateData };
        delete insertPayload.bulk_column_values;

        // 5. Crear el candidato en Supabase
        console.log('📝 Intentando insertar candidato en Supabase...');
        
        const { data: candidate, error: candidateError } = await supabase
            .from('candidates')
            .insert({
                ...insertPayload,
                created_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (candidateError) {
            console.error('❌ Error creando candidato:', candidateError);
            console.error('❌ Detalles del error:', JSON.stringify(candidateError, null, 2));
            return res.status(500).json({ 
                error: 'Failed to create candidate',
                details: candidateError.message,
                fullError: candidateError
            });
        }

        if (!candidate) {
            console.error('❌ Candidato no retornado después de insertar');
            return res.status(500).json({ 
                error: 'Candidate not returned after insert',
                candidateData
            });
        }

        console.log(`✅ Candidato creado: ${candidate.id} - ${candidate.name || candidate.email}`);

        if (bulkColumnValues && Object.keys(bulkColumnValues).length > 0) {
            const { error: bulkError } = await supabase
                .from('candidates')
                .update({ bulk_column_values: bulkColumnValues })
                .eq('id', candidate.id);
            if (bulkError) {
                console.warn('⚠️ bulk_column_values no guardado:', bulkError.message);
            } else {
                console.log('✅ bulk_column_values guardado');
            }
        }

        // 6. Crear entrada en historial
        // Nota: moved_by es UUID (referencia a usuario), no texto
        // Usamos null ya que es una integración automática
        const { error: historyError } = await supabase
            .from('candidate_history')
            .insert({
                candidate_id: candidate.id,
                stage_id: stages[0].id,
                moved_at: new Date().toISOString(),
                moved_by: null, // Integración automática, no hay usuario específico
                app_name: integration.app_name,
            });

        if (historyError) {
            console.warn('⚠️ Error creando historial (no crítico):', historyError);
            // No fallar el webhook por esto
        } else {
            console.log(`✅ Historial creado para candidato ${candidate.id}`);
        }

        console.log(`🎉 Webhook procesado exitosamente - Candidato: ${candidate.id}`);

        const response = { 
            success: true, 
            candidateId: candidate.id,
            candidateName: candidate.name || candidate.email,
            candidate: candidate
        };
        
        console.log('📤 Enviando respuesta:', JSON.stringify(response, null, 2));
        
        res.status(200).json(response);

    } catch (error) {
        console.error('❌ Error procesando webhook:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
});

export default router;
