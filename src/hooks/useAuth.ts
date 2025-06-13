import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { type User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const supabase = createBrowserSupabase();

    // Get initial user state
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      setUser(user);
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // When auth state changes, verify the user with getUser
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await createBrowserSupabase().auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    router.push('/dashboard');
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await createBrowserSupabase().auth.signUp({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    // Redirect to email confirmation page or show message
    router.push('/auth/verify-email');
  };

  const signOut = async () => {
    const { error } = await createBrowserSupabase().auth.signOut();
    if (error) {
      throw error;
    }
    router.push('/auth/login');
  };

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  };
} 