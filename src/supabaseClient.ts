import { createClient } from '@supabase/supabase-js';

// Şimdilik direkt bilgileri yazıyoruz ki hata payı sıfırlansın
const supabaseUrl = 'https://xvgdxasuekjtatecxzso.supabase.co';
const supabaseAnonKey = 'sb_publishable_jNQDV7LMw5MHY-WiABHSAw_WhWUbeAE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
