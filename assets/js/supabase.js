import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://baizofrsfkayctpujfay.supabase.co';
// This is the public anon/publishable key. Replace the placeholder with your Supabase publishable key.
const SUPABASE_ANON_KEY = 'REPLACE_WITH_YOUR_SUPABASE_PUBLISHABLE_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
