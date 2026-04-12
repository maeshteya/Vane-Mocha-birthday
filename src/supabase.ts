import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://scsyccvyjadpoyjdlodf.supabase.co';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_79ZsdfwLAVremJVqRQ6b9A_k2_OzsWd';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
