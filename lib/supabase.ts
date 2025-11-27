import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oxtdqniufdqjbadvocrs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94dGRxbml1ZmRxamJhZHZvY3JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzMzYyMDcsImV4cCI6MjA3NzkxMjIwN30.VAsjNfif-TviDL13XeWc1NWZP-CADmefUR_kfqYUFo8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
