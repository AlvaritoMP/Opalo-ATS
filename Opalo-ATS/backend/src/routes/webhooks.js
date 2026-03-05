import express from 'express';
import { createClient } from '@supabase/supabase-js';

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

// Función helper para obtener nombres estándar de campos
function getStandardFieldNames(candidateFieldKey) {
    const mappings = {
        name: ['name', 'nombre', 'nombre_completo', 'full_name', 'nombre_y_apellidos'],
        email: ['email', 'correo', 'e-mail'],
        phone: ['phone', 'telefono', 'teléfono', 'mobile', 'celular'],
        phone2: ['phone2', 'telefono2', 'teléfono_secundario', 'secondary_phone'],
        description: ['description', 'descripcion', 'notas', 'comments'],
        source: ['source', 'fuente', 'origen'],
        salary_expectation: ['salaryexpectation', 'expectativa_salarial', 'salario_esperado'],
        dni: ['dni', 'documento', 'documento_identidad', 'id_number'],
        linkedin_url: ['linkedinurl', 'linkedin', 'perfil_linkedin'],
        address: ['address', 'direccion', 'dirección'],
        province: ['province', 'provincia'],
        district: ['district', 'distrito'],
        age: ['age', 'edad'],
    };
    return mappings[candidateFieldKey] || [candidateFieldKey];
}

// Función para mapear datos de Tally a formato de candidato
function mapTallyToCandidate(tallyData, integration) {
    const candidate = {
        process_id: '', // Se llenará después
        stage_id: '',
        name: '',
        email: '',
        phone: '',
        phone2: '',
        description: '',
        source: integration.form_name || 'Tally',
        salary_expectation: '',
        dni: '',
        linkedin_url: '',
        address: '',
        province: '',
        district: '',
        age: null,
    };

    // Convertir array de fields a objeto para búsqueda rápida
    const fields = {};
    if (tallyData.fields && Array.isArray(tallyData.fields)) {
        tallyData.fields.forEach(field => {
            const key = field.key?.toLowerCase() || '';
            const label = field.label?.toLowerCase() || '';
            const value = field.value || '';
            
            // Guardar por key y por label
            if (key) fields[key] = value;
            if (label) fields[label] = value;
        });
    }

    // Obtener mapeo personalizado si existe
    let customMapping = {};
    if (integration.field_mapping) {
        try {
            if (typeof integration.field_mapping === 'string') {
                customMapping = JSON.parse(integration.field_mapping);
            } else if (typeof integration.field_mapping === 'object') {
                customMapping = integration.field_mapping;
            }
        } catch (err) {
            console.warn('Error parseando field_mapping:', err);
        }
    }

    // Función helper para obtener valor de campo
    const getFieldValue = (candidateFieldKey) => {
        // 1. Si hay mapeo personalizado, usarlo primero
        if (customMapping[candidateFieldKey]) {
            const mappedTallyField = customMapping[candidateFieldKey].toLowerCase();
            if (fields[mappedTallyField] !== undefined && fields[mappedTallyField] !== '') {
                return fields[mappedTallyField];
            }
        }
        
        // 2. Intentar con nombres estándar
        const standardNames = getStandardFieldNames(candidateFieldKey);
        for (const name of standardNames) {
            if (fields[name] !== undefined && fields[name] !== '') {
                return fields[name];
            }
        }
        
        return '';
    };

    // Mapear campos
    candidate.name = getFieldValue('name') || '';
    candidate.email = getFieldValue('email') || '';
    candidate.phone = getFieldValue('phone') || '';
    candidate.phone2 = getFieldValue('phone2') || '';
    candidate.description = getFieldValue('description') || '';
    candidate.salary_expectation = getFieldValue('salary_expectation') || '';
    candidate.dni = getFieldValue('dni') || '';
    candidate.linkedin_url = getFieldValue('linkedin_url') || '';
    candidate.address = getFieldValue('address') || '';
    candidate.province = getFieldValue('province') || '';
    candidate.district = getFieldValue('district') || '';
    
    // Manejar age como número
    const ageValue = getFieldValue('age');
    if (ageValue) {
        const ageNum = parseInt(ageValue, 10);
        candidate.age = isNaN(ageNum) ? null : ageNum;
    }

    return candidate;
}

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
        const webhookUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
        console.log(`🔍 Buscando integración con webhook_url: ${webhookUrl}`);

        // 1. Buscar la integración por webhook URL
        const { data: integration, error: integrationError } = await supabase
            .from('form_integrations')
            .select('*')
            .eq('webhook_url', webhookUrl)
            .maybeSingle();

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
            .select('id, stages')
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

        if (!process.stages || process.stages.length === 0) {
            console.error(`❌ Proceso no tiene etapas: ${integration.process_id}`);
            return res.status(400).json({ 
                error: 'Process has no stages',
                processId: integration.process_id 
            });
        }

        console.log(`✅ Proceso encontrado con ${process.stages.length} etapas`);

        // 3. Mapear campos de Tally a candidato
        const candidateData = mapTallyToCandidate(tallyData, integration);
        candidateData.process_id = integration.process_id;
        candidateData.stage_id = process.stages[0].id;
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

        // 4. Crear el candidato en Supabase
        const { data: candidate, error: candidateError } = await supabase
            .from('candidates')
            .insert({
                ...candidateData,
                created_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (candidateError) {
            console.error('❌ Error creando candidato:', candidateError);
            return res.status(500).json({ 
                error: 'Failed to create candidate',
                details: candidateError.message 
            });
        }

        console.log(`✅ Candidato creado: ${candidate.id} - ${candidate.name || candidate.email}`);

        // 5. Crear entrada en historial
        // Nota: moved_by es UUID (referencia a usuario), no texto
        // Usamos null ya que es una integración automática
        const { error: historyError } = await supabase
            .from('candidate_history')
            .insert({
                candidate_id: candidate.id,
                stage_id: process.stages[0].id,
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

        res.status(200).json({ 
            success: true, 
            candidateId: candidate.id,
            candidateName: candidate.name || candidate.email
        });

    } catch (error) {
        console.error('❌ Error procesando webhook:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
});

export default router;
