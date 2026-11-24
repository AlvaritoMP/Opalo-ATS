import { supabase } from '../supabase';
import { FormIntegration, FieldMapping } from '../../types';
import { APP_NAME } from '../appConfig';
import { dedupedRead, invalidateDedupedRead, REST_PAGE_SIZE } from './readDedup';

const FORM_INTEGRATION_COLUMNS =
    'id, app_name, platform, form_name, form_id_or_url, process_id, webhook_url, field_mapping, created_at';
const FORM_INTEGRATION_COLUMNS_CORE =
    'id, app_name, platform, form_name, form_id_or_url, process_id, webhook_url, created_at';

function isMissingIntegrationColumn(error: { message?: string; code?: string } | null): boolean {
    if (!error) return false;
    const msg = (error.message || '').toLowerCase();
    return error.code === '42703' || msg.includes('field_mapping') || msg.includes('schema cache') || msg.includes('column');
}

const formIntegrationsCacheKey = `form_integrations:${APP_NAME}`;

// Convertir de DB a tipo de aplicación
function dbToFormIntegration(dbIntegration: any): FormIntegration {
    let fieldMapping: FieldMapping | undefined = undefined;
    
    // Manejar field_mapping que puede venir como JSONB (objeto) o JSON (string)
    if (dbIntegration.field_mapping) {
        try {
            if (typeof dbIntegration.field_mapping === 'string') {
                fieldMapping = JSON.parse(dbIntegration.field_mapping);
            } else if (typeof dbIntegration.field_mapping === 'object') {
                fieldMapping = dbIntegration.field_mapping;
            }
        } catch (err) {
            console.warn('Error parseando field_mapping:', err);
            fieldMapping = undefined;
        }
    }
    
    return {
        id: dbIntegration.id,
        platform: dbIntegration.platform || 'Tally',
        formName: dbIntegration.form_name || '',
        formIdOrUrl: dbIntegration.form_id_or_url || '',
        processId: dbIntegration.process_id || '',
        webhookUrl: dbIntegration.webhook_url || '',
        fieldMapping,
    };
}

// Convertir de tipo de aplicación a DB
function formIntegrationToDb(integration: Partial<FormIntegration>): any {
    const dbIntegration: any = {};
    if (integration.platform !== undefined) dbIntegration.platform = integration.platform;
    if (integration.formName !== undefined) dbIntegration.form_name = integration.formName;
    if (integration.formIdOrUrl !== undefined) dbIntegration.form_id_or_url = integration.formIdOrUrl;
    if (integration.processId !== undefined) dbIntegration.process_id = integration.processId;
    if (integration.webhookUrl !== undefined) dbIntegration.webhook_url = integration.webhookUrl;
    // Solo incluir field_mapping si existe y tiene al menos una propiedad
    if (integration.fieldMapping !== undefined && 
        integration.fieldMapping !== null &&
        typeof integration.fieldMapping === 'object' &&
        Object.keys(integration.fieldMapping).length > 0) {
        dbIntegration.field_mapping = JSON.stringify(integration.fieldMapping);
    }
    return dbIntegration;
}

export const formIntegrationsApi = {
    // Obtener todas las integraciones
    async getAll(abortSignal?: AbortSignal): Promise<FormIntegration[]> {
        return dedupedRead(formIntegrationsCacheKey, 2000, async () => {
            const rows: any[] = [];
            let columns = FORM_INTEGRATION_COLUMNS;
            for (let from = 0; from < 200; from += REST_PAGE_SIZE) {
                const run = (cols: string) => {
                    let query = supabase
                        .from('form_integrations')
                        .select(cols)
                        .eq('app_name', APP_NAME)
                        .order('created_at', { ascending: false })
                        .range(from, from + REST_PAGE_SIZE - 1);
                    if (abortSignal) query = query.abortSignal(abortSignal);
                    return query;
                };
                let { data, error } = await run(columns);
                if (error && columns !== FORM_INTEGRATION_COLUMNS_CORE && isMissingIntegrationColumn(error)) {
                    columns = FORM_INTEGRATION_COLUMNS_CORE;
                    ({ data, error } = await run(columns));
                }
                if (error) throw error;
                const page = data || [];
                rows.push(...page);
                if (page.length < REST_PAGE_SIZE) break;
            }
            return rows.map(dbToFormIntegration);
        });
    },

    // Obtener una integración por ID
    async getById(id: string): Promise<FormIntegration | null> {
        const { data, error } = await supabase
            .from('form_integrations')
            .select(FORM_INTEGRATION_COLUMNS)
            .eq('id', id)
            .eq('app_name', APP_NAME)
            .maybeSingle();
        
        if (error) throw error;
        if (!data) return null;
        
        return dbToFormIntegration(data);
    },

    // Obtener integración por webhook URL (para procesar webhooks)
    async getByWebhookUrl(webhookUrl: string): Promise<FormIntegration | null> {
        const { data, error } = await supabase
            .from('form_integrations')
            .select(FORM_INTEGRATION_COLUMNS)
            .eq('webhook_url', webhookUrl)
            .eq('app_name', APP_NAME)
            .maybeSingle();
        
        if (error) throw error;
        if (!data) return null;
        
        return dbToFormIntegration(data);
    },

    // Crear nueva integración
    async create(integrationData: Omit<FormIntegration, 'id'>): Promise<FormIntegration> {
        const dbData = formIntegrationToDb(integrationData);
        dbData.app_name = APP_NAME;
        
        // Generar ID único para el webhook
        const webhookId = crypto.randomUUID();
        // Construir URL del webhook usando Edge Function de Supabase
        // Esto es más confiable que usar el backend de Easypanel
        // La URL de Supabase viene de VITE_SUPABASE_URL (ej: https://afhiiplxqtodqxvmswor.supabase.co)
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        if (!supabaseUrl) {
            throw new Error('VITE_SUPABASE_URL no está configurada. No se puede crear la integración.');
        }
        dbData.webhook_url = `${supabaseUrl}/functions/v1/tally-webhook/${webhookId}`;
        
        // Separar field_mapping para manejarlo por separado (puede no existir la columna)
        const { field_mapping, ...standardFields } = dbData;
        
        // Validar campos requeridos
        if (!standardFields.platform || !standardFields.form_name || !standardFields.form_id_or_url || !standardFields.process_id) {
            throw new Error('Faltan campos requeridos: platform, formName, formIdOrUrl, processId');
        }
        
        console.log('🔍 Datos a insertar (sin field_mapping):', standardFields);
        
        // Intentar insertar primero sin field_mapping
        let { data, error } = await supabase
            .from('form_integrations')
            .insert(standardFields)
            .select(FORM_INTEGRATION_COLUMNS)
            .single();
        
        if (error) {
            console.error('❌ Error al crear integración:', error);
            console.error('❌ Código de error:', error.code);
            console.error('❌ Mensaje:', error.message);
            console.error('❌ Detalles:', error.details);
            console.error('❌ Hint:', error.hint);
            
            // Si el error es por columnas faltantes, intentar sin field_mapping
            const errorMsg = error.message || '';
            if (errorMsg.includes('field_mapping') || errorMsg.includes('column') || error.code === '42703') {
                console.warn('⚠️ Columna field_mapping no existe, intentando sin ella...');
                // Ya intentamos sin field_mapping, así que el error es otro
                throw new Error(`Error de base de datos: ${error.message}. Verifica que la columna field_mapping existe o ejecuta MIGRATION_ADD_FIELD_MAPPING.sql`);
            }
            throw new Error(`Error al crear integración: ${error.message || 'Error desconocido'}`);
        }
        
        if (!data) throw new Error('No se creó la integración');
        invalidateDedupedRead(formIntegrationsCacheKey);
        
        // Si hay field_mapping y se creó correctamente, intentar actualizarlo
        if (field_mapping && data.id) {
            try {
                // field_mapping viene como string JSON de formIntegrationToDb, parsearlo a objeto para JSONB
                const fieldMappingObj = typeof field_mapping === 'string' ? JSON.parse(field_mapping) : field_mapping;
                // Intentar actualizar con field_mapping como JSONB
                const { error: updateError } = await supabase
                    .from('form_integrations')
                    .update({ field_mapping: fieldMappingObj })
                    .eq('id', data.id);
                
                if (updateError) {
                    const updateErrorMsg = updateError.message || '';
                    if (updateErrorMsg.includes('field_mapping') || updateErrorMsg.includes('column')) {
                        console.warn('⚠️ Columna field_mapping no existe. Ejecuta MIGRATION_ADD_FIELD_MAPPING.sql para habilitar esta funcionalidad.');
                    } else {
                        console.warn('⚠️ Error actualizando field_mapping:', updateError);
                    }
                    // No lanzar error, la integración se creó correctamente
                }
            } catch (err) {
                console.warn('⚠️ Error procesando field_mapping:', err);
                // No lanzar error, la integración se creó correctamente
            }
        }
        
        // Recargar la integración completa
        const fullIntegration = await this.getById(data.id);
        if (!fullIntegration) throw new Error('No se pudo recargar la integración');
        
        return fullIntegration;
    },

    // Actualizar integración
    async update(id: string, integrationData: Partial<FormIntegration>): Promise<FormIntegration> {
        const dbData = formIntegrationToDb(integrationData);
        // No permitir cambiar app_name
        delete dbData.app_name;
        
        // Separar field_mapping para manejarlo por separado
        const { field_mapping, ...standardFields } = dbData;
        
        // Actualizar campos estándar primero
        const { data, error } = await supabase
            .from('form_integrations')
            .update(standardFields)
            .eq('id', id)
            .eq('app_name', APP_NAME)
            .select(FORM_INTEGRATION_COLUMNS)
            .single();
        
        if (error) throw error;
        if (!data) throw new Error('No se actualizó la integración');
        invalidateDedupedRead(formIntegrationsCacheKey);
        
        // Si hay field_mapping, intentar actualizarlo por separado
        if (field_mapping !== undefined && data.id) {
            try {
                const fieldMappingValue = typeof field_mapping === 'string' 
                    ? JSON.parse(field_mapping) 
                    : field_mapping;
                
                const { error: updateError } = await supabase
                    .from('form_integrations')
                    .update({ field_mapping: fieldMappingValue })
                    .eq('id', data.id);
                
                if (updateError) {
                    const updateErrorMsg = updateError.message || '';
                    if (updateErrorMsg.includes('field_mapping') || updateErrorMsg.includes('column')) {
                        console.warn('⚠️ Columna field_mapping no existe. Ejecuta MIGRATION_ADD_FIELD_MAPPING.sql para habilitar esta funcionalidad.');
                    } else {
                        console.warn('⚠️ Error actualizando field_mapping:', updateError);
                    }
                    // No lanzar error, los otros campos se actualizaron correctamente
                }
            } catch (err) {
                console.warn('⚠️ Error procesando field_mapping:', err);
                // No lanzar error, los otros campos se actualizaron correctamente
            }
        }
        
        // Recargar la integración completa
        const fullIntegration = await this.getById(data.id);
        if (!fullIntegration) throw new Error('No se pudo recargar la integración');
        
        return fullIntegration;
    },

    // Eliminar integración
    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('form_integrations')
            .delete()
            .eq('id', id)
            .eq('app_name', APP_NAME);
        
        if (error) throw error;
        invalidateDedupedRead(formIntegrationsCacheKey);
    },
};
