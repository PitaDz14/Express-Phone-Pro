import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ikwdtzclwxnseoingnlh.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_-5hviZUY3ymBxx9Je_aF0Q_mT_Sd3Np';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
