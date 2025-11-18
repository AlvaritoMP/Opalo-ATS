import { supabase } from '../supabase';
import { PostIt } from '../../types';

export const postItsApi = {
    // Crear post-it
    async create(candidateId: string, postIt: Omit<PostIt, 'id' | 'createdAt'>): Promise<PostIt> {
        const { data, error } = await supabase
            .from('post_its')
            .insert({
                candidate_id: candidateId,
                text: postIt.text,
                color: postIt.color,
                created_by: postIt.createdBy,
            })
            .select()
            .single();
        
        if (error) throw error;
        
        return {
            id: data.id,
            text: data.text,
            color: data.color,
            createdBy: data.created_by,
            createdAt: data.created_at,
        };
    },

    // Eliminar post-it
    async delete(postItId: string): Promise<void> {
        const { error } = await supabase
            .from('post_its')
            .delete()
            .eq('id', postItId);
        
        if (error) throw error;
    },
};

