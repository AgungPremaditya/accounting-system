import { createBrowserClient } from '@supabase/ssr';
import { type Database } from '@/types/database.types';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create a singleton instance
const supabase = createBrowserClient<Database>(
  supabaseUrl,
  supabaseAnonKey
);

export { supabase };

// Also export the creator function for components that need a fresh instance
export const createBrowserSupabase = () => {
  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey
  );
}; 