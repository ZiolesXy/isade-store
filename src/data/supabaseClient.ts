import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  throw new Error('VITE_SUPABASE_URL belum diatur.');
}
if (!supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_PUBLISHABLE_KEY belum diatur.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
