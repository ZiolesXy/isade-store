import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error(
    'VITE_SUPABASE_URL belum diatur. Isi di .env.local sesuai .env.example (PRD bagian 10.1).',
  )
}

if (!supabaseAnonKey) {
  throw new Error(
    'VITE_SUPABASE_ANON_KEY belum diatur. Isi di .env.local sesuai .env.example (PRD bagian 10.1).',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
