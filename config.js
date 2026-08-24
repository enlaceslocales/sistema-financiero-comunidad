const SUPABASE_URL = "https://uvlleaprlqtfmlyehmay.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_I1LkyxCEy5oqayRqtLTzMg_CRzu6Bu_";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);