// Supabase Configuration
// Replace the values below with your actual project credentials from the Supabase Dashboard
// Settings -> API -> Project URL & Anon Key

const SUPABASE_URL = 'https://uoxjdmkqeydxnrrynoon.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVveGpkbWtxZXlkeG5ycnlub29uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNDI0MzEsImV4cCI6MjA5MTYxODQzMX0.D_ycDAScWNvKiTi0sNopxNjqGKE5QWeR5lTlFBN1z6o';

// Initialize the Supabase client
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
