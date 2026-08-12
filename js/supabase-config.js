// استدعاء مكتبة Supabase عبر CDN
const SUPABASE_URL = "YOUR_SUPABASE_URL_HERE";
const SUPABASE_KEY = "YOUR_SUPABASE_ANON_KEY_HERE";

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
