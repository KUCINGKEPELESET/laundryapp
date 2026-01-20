
// Initialize Supabase
const SUPABASE_URL = 'https://qnxcwjezlbymkkpzptnw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_n1k_PjzrpTRUhzIFfLfhew_c0-EQkNl';

// Check if the script is loaded
if (typeof supabase === 'undefined') {
    console.error('Supabase.js not loaded! Make sure to include the CDN script before this file.');
} else {
    window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('Supabase initialized as window.sb');
}
