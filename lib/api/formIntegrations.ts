import { supabase } from '../supabase';
import { FormIntegration } from '../../types';
import { APP_NAME } from '../appConfig';

// Convertir de DB a tipo de aplicación
function dbToFormIntegration(dbIntegration: any): FormIntegration {
    return {
        id: dbIntegration.id,
        platform: dbIntegration.platform || 'Tally',
        formName: dbIntegration.form_name || '',
        formIdOrUrl: dbIntegration.form_id_or_url || '',
        processId: dbIntegration.process_id || '',
        webhookUrl: dbIntegration.webhook_url || '',
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
    return dbIntegration;
}

export const formIntegrationsApi = {
    // Obtener todas las integraciones
    async getAll(): Promise<FormIntegration[]> {
        const { data, error } = await supabase
            .from('form_integrations')
            .select('*')
            .eq('app_name', APP_NAME)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        if (!data) return [];
        
        return data.map(dbToFormIntegration);
    },

    // Obtener una integración por ID
    async getById(id: string): Promise<FormIntegration | null> {
        const { data, error } = await supabase
            .from('form_integrations')
            .select('*')
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
            .select('*')
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
        // Construir URL del webhook basada en la URL base de la app
        // En producción, esto debería usar la URL real de tu backend
        // Si tienes VITE_API_URL configurado, úsalo; si no, usa la URL del frontend
        const baseUrl = import.meta.env.VITE_API_URL || 
            (typeof window !== 'undefined' ? window.location.origin : 'https://opalo-atsopalo-backend.bouasv.easypanel.host');
        dbData.webhook_url = `${baseUrl}/api/webhooks/tally/${webhookId}`;
        
        const { data, error } = await supabase
            .from('form_integrations')
            .insert(dbData)
            .select()
            .single();
        
        if (error) throw error;
        if (!data) throw new Error('No se creó la integración');
        
        return dbToFormIntegration(data);
    },

    // Actualizar integración
    async update(id: string, integrationData: Partial<FormIntegration>): Promise<FormIntegration> {
        const dbData = formIntegrationToDb(integrationData);
        // No permitir cambiar app_name
        delete dbData.app_name;
        
        const { data, error } = await supabase
            .from('form_integrations')
            .update(dbData)
            .eq('id', id)
            .eq('app_name', APP_NAME)
            .select()
            .single();
        
        if (error) throw error;
        if (!data) throw new Error('No se actualizó la integración');
        
        return dbToFormIntegration(data);
    },

    // Eliminar integración
    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('form_integrations')
            .delete()
            .eq('id', id)
            .eq('app_name', APP_NAME);
        
        if (error) throw error;
    },
};
