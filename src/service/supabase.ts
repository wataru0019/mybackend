import { createClient } from '@supabase/supabase-js';

export function supabase(_supabaseUrl: string, _supabaseKey: string) {
    const supabaseUrl = _supabaseUrl
    const supabaseKey = _supabaseKey

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase URL and Key must be provided');
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    return supabase;
}