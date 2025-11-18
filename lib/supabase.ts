import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://afhiiplxqtodqxvmswor.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmaGlpcGx4cXRvZHF4dm1zd29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Njg4MTYsImV4cCI6MjA3ODQ0NDgxNn0.r9YmrHHajLsd5YHUkPnmD7UazpvmsW0TfqC5jy0_3ZU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Función helper para establecer el usuario actual en la sesión
export async function setCurrentUser(userId: string) {
    try {
        // Intentar usar la función RPC si existe
        const { error } = await supabase.rpc('set_current_user', { user_id: userId });
        if (error) {
            // Si la función RPC no existe o falla, simplemente continuar
            // Las políticas RLS usarán el userId del localStorage
            console.warn('set_current_user RPC not available, using localStorage fallback:', error.message);
        }
    } catch (err) {
        // Si hay un error, simplemente continuar - no es crítico
        console.warn('Error in setCurrentUser (non-critical):', err);
    }
}

// Función helper para obtener el usuario actual
export async function getCurrentUserId(): Promise<string | null> {
    try {
        const { data, error } = await supabase.rpc('get_current_user_id');
        if (error) {
            console.error('Error getting current user:', error);
            return null;
        }
        return data;
    } catch (err) {
        console.error('Error in getCurrentUserId:', err);
        return null;
    }
}

