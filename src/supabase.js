import { createClient } from '@supabase/supabase-js'

// Substitua pelos valores do seu projeto em:
// Supabase > Project Settings > API
const SUPABASE_URL = 'https://nhwqujhesjegylpblahw.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_8w_FDpkylebWIFYWXew1Xw_Bhu8KSW9'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)