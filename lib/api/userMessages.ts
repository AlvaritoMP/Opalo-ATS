import { supabase } from '../supabase';
import { APP_NAME } from '../appConfig';
import type { UserMessage } from '../../types';
import { isMissingColumnError } from '../supabaseColumnErrors';

function dbToMessage(row: Record<string, unknown>): UserMessage {
    return {
        id: row.id as string,
        senderId: row.sender_id as string,
        recipientId: row.recipient_id as string,
        text: row.text as string,
        readAt: (row.read_at as string) || undefined,
        createdAt: row.created_at as string,
    };
}

export const userMessagesApi = {
    async isAvailable(): Promise<boolean> {
        const { error } = await supabase
            .from('user_messages')
            .select('id')
            .eq('app_name', APP_NAME)
            .limit(1);
        if (error && isMissingColumnError(error)) return false;
        return !error;
    },

    async getRecent(limit = 100): Promise<UserMessage[]> {
        const { data, error } = await supabase
            .from('user_messages')
            .select('*')
            .eq('app_name', APP_NAME)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            if (isMissingColumnError(error)) return [];
            throw error;
        }
        return (data || []).map(dbToMessage).reverse();
    },

    async getConversation(partnerId: string, currentUserId: string, limit = 50): Promise<UserMessage[]> {
        const { data, error } = await supabase
            .from('user_messages')
            .select('*')
            .eq('app_name', APP_NAME)
            .or(
                `and(sender_id.eq.${currentUserId},recipient_id.eq.${partnerId}),and(sender_id.eq.${partnerId},recipient_id.eq.${currentUserId})`
            )
            .order('created_at', { ascending: true })
            .limit(limit);

        if (error) {
            if (isMissingColumnError(error)) return [];
            throw error;
        }
        return (data || []).map(dbToMessage);
    },

    async send(senderId: string, recipientId: string, text: string): Promise<UserMessage> {
        const trimmed = text.trim();
        if (!trimmed) throw new Error('El mensaje no puede estar vacío');

        const { data, error } = await supabase
            .from('user_messages')
            .insert({
                sender_id: senderId,
                recipient_id: recipientId,
                text: trimmed,
                app_name: APP_NAME,
            })
            .select()
            .single();

        if (error) throw error;
        return dbToMessage(data);
    },

    async markAsRead(messageIds: string[]): Promise<void> {
        if (messageIds.length === 0) return;
        const now = new Date().toISOString();
        const { error } = await supabase
            .from('user_messages')
            .update({ read_at: now })
            .in('id', messageIds)
            .eq('app_name', APP_NAME)
            .is('read_at', null);

        if (error && !isMissingColumnError(error)) throw error;
    },

    async getUnreadCount(recipientId: string): Promise<number> {
        const { count, error } = await supabase
            .from('user_messages')
            .select('id', { count: 'exact', head: true })
            .eq('app_name', APP_NAME)
            .eq('recipient_id', recipientId)
            .is('read_at', null);

        if (error) {
            if (isMissingColumnError(error)) return 0;
            throw error;
        }
        return count || 0;
    },
};
