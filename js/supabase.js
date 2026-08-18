/* ==========================================================
   supabase.js
   Initializes the Supabase client used by every page.

   1. Create a project at https://supabase.com
   2. Run supabase-schema.sql in the SQL Editor
   3. Paste your Project URL + anon public key below
      (Project Settings → API). NEVER put the service_role
      key here — only the public "anon" key belongs in
      frontend code.
   ========================================================== */

const SUPABASE_URL = 'https://filplaydjyjgreebseca.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_tFBTjgPmN_CHb3HywfKtmA_dRhyd9_O';

// supabase-js v2 is loaded via CDN <script> in every HTML page
// (see the <script src="https://unpkg.com/@supabase/supabase-js@2"...>
// tag above this file). That script exposes a global `supabase` object
// with a .createClient() factory — we use it once here and store the
// resulting client on window.db so every page/module can reuse it.

window.db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Simple guard so pages can warn the admin instead of failing silently
// if the placeholders above were never filled in.
window.SUPABASE_CONFIGURED = !SUPABASE_URL.includes('YOUR-PROJECT-REF');
