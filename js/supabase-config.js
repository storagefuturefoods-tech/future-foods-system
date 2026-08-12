// استدعاء مكتبة Supabase عبر CDN
const SUPABASE_URL = "https://ndleohbmgqhpyvecwdkj.supabase.co";
const SUPABASE_KEY = "sb_publishable_wzWbiUcaAyndWJRI37zmgQ_fgh-m0h6";

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
