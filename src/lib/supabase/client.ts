import { createClient } from '@supabase/supabase-js';
import { cookies } from '../cookies';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storage: {
      getItem: (key: string) => {
        // For auth tokens, use cookies
        if (key === 'supabase.auth.token') {
          const tokens = cookies.getAuthTokens();
          if (!tokens.access_token) return null;
          return JSON.stringify({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: Date.now() + 3600 * 1000, // 1 hour from now
            expires_in: 3600,
            token_type: 'bearer',
          });
        }
        // For other data, use localStorage
        if (typeof window !== 'undefined') {
          return localStorage.getItem(key);
        }
        return null;
      },
      setItem: (key: string, value: string) => {
        // For auth tokens, use cookies
        if (key === 'supabase.auth.token') {
          try {
            const parsed = JSON.parse(value);
            cookies.setAuthTokens(parsed.access_token, parsed.refresh_token);
          } catch (error) {
            console.error('Error parsing auth tokens:', error);
          }
          return;
        }
        // For other data, use localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem(key, value);
        }
      },
      removeItem: (key: string) => {
        // For auth tokens, clear cookies
        if (key === 'supabase.auth.token') {
          cookies.clearAuthTokens();
          return;
        }
        // For other data, use localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem(key);
        }
      },
    },
  },
}); 