import { supabase } from '../supabase';
import { Client } from '../../types';
import { APP_NAME } from '../appConfig';
import { dedupedRead, invalidateDedupedRead, REST_PAGE_SIZE } from './readDedup';

const CLIENT_COLUMNS = 'id, razon_social, ruc, created_at, updated_at';
const CLIENTS_CACHE_KEY = `clients:${APP_NAME}`;

function throwClientApiError(op: string, error: any): never {
    const code = error?.code ?? '';
    const msg = error?.message ?? String(error);
    const details = error?.details ?? '';
    const hint = error?.hint ?? '';
    const full = [msg, code && `code=${code}`, details && `details=${details}`, hint && `hint=${hint}`]
        .filter(Boolean)
        .join(' | ');
    console.error(`[clientsApi.${op}]`, { code, message: msg, details, hint, error });
    const err = new Error(
        `Clientes (${op}): ${full}\n` +
            (code === '42501' || /permission denied/i.test(msg)
                ? 'Falta GRANT o política RLS en public.clients. Ejecute MIGRATION_FIX_CLIENTS_ANON_GRANTS.sql en Supabase.'
                : '')
    );
    (err as any).code = code;
    throw err;
}

// Convertir de DB a tipo de aplicación
function dbToClient(dbClient: any): Client {
    return {
        id: dbClient.id,
        razonSocial: dbClient.razon_social,
        ruc: dbClient.ruc,
        createdAt: dbClient.created_at,
        updatedAt: dbClient.updated_at,
    };
}

// Convertir de tipo de aplicación a DB
function clientToDb(client: Partial<Client>): any {
    const dbClient: any = {};
    if (client.razonSocial !== undefined) dbClient.razon_social = client.razonSocial;
    if (client.ruc !== undefined) dbClient.ruc = client.ruc;
    return dbClient;
}

export const clientsApi = {
    // Obtener todos los clientes
    async getAll(): Promise<Client[]> {
        return dedupedRead(CLIENTS_CACHE_KEY, 2000, async () => {
            const rows: any[] = [];
            for (let from = 0; from < 500; from += REST_PAGE_SIZE) {
                const { data, error } = await supabase
                    .from('clients')
                    .select(CLIENT_COLUMNS)
                    .eq('app_name', APP_NAME)
                    .order('razon_social', { ascending: true })
                    .range(from, from + REST_PAGE_SIZE - 1);
                if (error) throwClientApiError('getAll', error);
                const page = data || [];
                rows.push(...page);
                if (page.length < REST_PAGE_SIZE) break;
            }
            return rows.map(dbToClient);
        });
    },

    // Obtener un cliente por ID
    async getById(id: string): Promise<Client | null> {
        const { data, error } = await supabase
            .from('clients')
            .select(CLIENT_COLUMNS)
            .eq('id', id)
            .eq('app_name', APP_NAME)
            .single();
        
        if (error) {
            if (error.code === 'PGRST116') return null; // No encontrado
            throwClientApiError('getById', error);
        }
        return data ? dbToClient(data) : null;
    },

    // Crear un cliente
    async create(clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<Client> {
        const dbData = clientToDb(clientData);
        dbData.app_name = APP_NAME;
        
        const { data, error } = await supabase
            .from('clients')
            .insert(dbData)
            .select(CLIENT_COLUMNS)
            .single();
        
        if (error) throwClientApiError('create', error);
        invalidateDedupedRead(CLIENTS_CACHE_KEY);
        return dbToClient(data);
    },

    // Actualizar un cliente
    async update(id: string, clientData: Partial<Client>): Promise<Client> {
        const dbData = clientToDb(clientData);
        
        const { data, error } = await supabase
            .from('clients')
            .update(dbData)
            .eq('id', id)
            .eq('app_name', APP_NAME)
            .select(CLIENT_COLUMNS)
            .single();
        
        if (error) throwClientApiError('update', error);
        invalidateDedupedRead(CLIENTS_CACHE_KEY);
        return dbToClient(data);
    },

    // Eliminar un cliente
    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('clients')
            .delete()
            .eq('id', id)
            .eq('app_name', APP_NAME);
        
        if (error) throwClientApiError('delete', error);
        invalidateDedupedRead(CLIENTS_CACHE_KEY);
    },
};
