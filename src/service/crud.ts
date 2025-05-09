import { supabase } from "./supabase";

export async function insertMessage(supabaseUrl: string, supabaseKey: string, chat_id: string, msgs: object[], title: string, user_id: string) {
    const _supabase = supabase(supabaseUrl, supabaseKey);
    try {
        const { data, error } = await _supabase
            .from('messages')
            .insert([
                {
                    user_id: user_id,
                    chat_id: chat_id,
                    messages: msgs,
                    chat_title: title,
                }
            ])
            .select();

        if (error) {
            console.error('Error inserting message:', error);
            throw error;
        }

        // console.log('Inserted data:', data);
        return data;
    } catch (e) {
        console.error('Caught error:', e);
        throw e;
    }
}

export async function readMessages(supabaseUrl: string, supabaseKey: string, chat_id: string) {
    const _supabase = supabase(supabaseUrl, supabaseKey);
    try {
        const { data, error } = await _supabase
            .from('messages')
            .select('chat_id, messages')
            .eq('chat_id', chat_id)
          
          if (error) {
            console.error('Error reading messages:', error);
            throw error;
          }
        // console.log('Read data:', data);
        return data;
    } catch (e) {
        console.error('Caught error:', e);
        throw e;
    }
}

export async function readThreadId(supabaseUrl: string, supabaseKey: string) {
    const _supabase = supabase(supabaseUrl, supabaseKey);
    try {
        const { data, error } = await _supabase
            .from('messages')
            .select('id, chat_id')
            .order('id', { ascending: true })
          
          if (error) {
            console.error('Error reading messages:', error);
            throw error;
          }
        const lastChatId = parseInt(data[data.length - 1].chat_id);
        const nextChatId = (lastChatId + 1).toString();
        // console.log('Last chat_id:', nextChatId);
        // console.log('Read data:', data);
        return nextChatId;
    } catch (e) {
        console.error('Caught error:', e);
        throw e;
    }
}

export async function updateMessage(supabaseUrl: string, supabaseKey: string, chat_id: string, messages: object[]) {
    const _supabase = supabase(supabaseUrl, supabaseKey);
    try {
        const { data, error } = await _supabase
            .from('messages')
            .update({ messages: messages })
            .eq('chat_id', chat_id)
            .select();

        // console.log('Read data:', data);

        if (error) {
            console.error('Error updating message:', error);
            throw error;
        }

        return data;
    } catch (e) {
        console.error('Caught error:', e);
        throw e;
    }
}