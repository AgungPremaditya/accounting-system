import { createServerSupabase } from '@/lib/supabase/server';
import type { inferAsyncReturnType } from '@trpc/server';

export async function createContext() {
  const supabase = await createServerSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();

  return {
    user: user ? {
      id: user.id,
      email: user.email || '',
    } : null,
  };
}

export type Context = inferAsyncReturnType<typeof createContext>; 