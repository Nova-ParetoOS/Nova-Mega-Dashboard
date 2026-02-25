import { createClient } from '@supabase/supabase-js'

// Isso obriga o código a ler o que estiver na Vercel ou no .env.local
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)