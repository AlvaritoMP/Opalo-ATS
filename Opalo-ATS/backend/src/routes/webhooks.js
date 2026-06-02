import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { applyImportTextCaseToCandidate } from '../../../../lib/importTextCase.js';
import { buildTallyCandidateFromSubmission } from '../../../../lib/tallyWebhookMapping.js';
import { processTallyCandidateUpsert } from '../../../../lib/tallyCandidateUpsert.js';

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
            console.error(`❌ Integración no encontrada para webhook: ${webhookUrlHttps}`)
            return res.status(404).json({ 
                error: 'Integration not found',
                webhookUrl: webhookUrlHttps,
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

        let bulkConfigParsed = process.bulk_config;
        if (typeof bulkConfigParsed === 'string') {
            try {
                bulkConfigParsed = JSON.parse(bulkConfigParsed);
            } catch {
                bulkConfigParsed = {};
            }
        }
        const customColumns = bulkConfigParsed?.customColumns || [];
        const upsertResult = await processTallyCandidateUpsert(supabase, {
            processId: integration.process_id,
            appName: integration.app_name,
            stageId: stages[0].id,
            candidateData,
            customColumns,
        });

        const { data: candidate, error: candidateError } = await supabase
            .from('candidates')
            .select('*')
            .eq('id', upsertResult.candidateId)
            .single();

        if (candidateError || !candidate) {
            console.error('❌ Error cargando candidato tras upsert:', candidateError);
            return res.status(500).json({
                error: 'Failed to load candidate after upsert',
                details: candidateError?.message,
            });
        }

        console.log(
            upsertResult.isReapplication
                ? `✅ Re-postulación #${upsertResult.applicationCount}: ${candidate.id}`
                : `✅ Candidato creado: ${candidate.id} - ${candidate.name || candidate.email}`
        );

        console.log(`🎉 Webhook procesado exitosamente - Candidato: ${candidate.id}`);

        const response = {
            success: true,
            candidateId: candidate.id,
            candidateName: candidate.name || candidate.email,
            isReapplication: upsertResult.isReapplication,
            applicationCount: upsertResult.applicationCount,
            candidate,
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
